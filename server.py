"""
BugLens Backend API Server
Provides secure integration with Google's Gemini API for Gemma 4 (gemma-4-31b-it).
"""

import os
import re
import json
import base64
import time
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv, dotenv_values

# Resolve absolute path to .env file relative to server.py
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

app = Flask(__name__, static_folder=".")


def get_gemini_api_key() -> str | None:
    """
    Retrieve GEMINI_API_KEY safely from os.environ, dotenv_values, or direct file parsing.
    Ensures hot-reloading when .env is updated without requiring a restart.
    """
    # 1. Reload .env with override
    try:
        load_dotenv(dotenv_path=ENV_PATH, override=True)
    except Exception:
        pass

    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key

    # 2. Direct parse from .env file via dotenv_values
    if ENV_PATH.exists():
        try:
            env_dict = dotenv_values(ENV_PATH)
            key = (env_dict.get("GEMINI_API_KEY") or "").strip()
            if key:
                os.environ["GEMINI_API_KEY"] = key
                return key
        except Exception:
            pass

    # 3. Direct line-by-line read fallback
    if ENV_PATH.exists():
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY="):
                        key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if key:
                            os.environ["GEMINI_API_KEY"] = key
                            return key
        except Exception:
            pass

    return None

# Ensure static folder serves files directly
@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(".", filename)


def parse_structured_response(text: str) -> dict:
    """
    Safely parse the model response as JSON and normalize all visual diagnostic fields.
    """
    clean_text = text.strip()
    
    # Remove markdown code fences if present
    if clean_text.startswith("```"):
        clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r"\s*```$", "", clean_text)
        clean_text = clean_text.strip()
    
    data = {}
    try:
        data = json.loads(clean_text)
    except json.JSONDecodeError:
        # Attempt to find JSON object substring
        json_match = re.search(r"(\{.*\})", clean_text, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
            except Exception:
                data = {}

    if not isinstance(data, dict) or not data:
        data = {
            "problem": clean_text[:200] if len(clean_text) > 200 else clean_text,
            "category": "Layout",
            "severity": "Medium",
            "suggested_fix": {"action": clean_text, "priority": "HIGH"},
            "confidence": "Medium",
            "confidence_pct": 75,
            "ui_health_score": 72,
            "issue_count": 1,
            "raw_text": clean_text
        }

    # Normalize category
    if "category" not in data or not data["category"]:
        prob = (str(data.get("problem", "")) + " " + str(data.get("likely_causes", ""))).lower()
        if "align" in prob:
            data["category"] = "Alignment"
        elif "space" in prob or "margin" in prob or "padding" in prob or "gap" in prob:
            data["category"] = "Spacing"
        elif "font" in prob or "text" in prob or "typography" in prob or "truncate" in prob:
            data["category"] = "Typography"
        elif "color" in prob or "contrast" in prob or "dark" in prob or "light" in prob:
            data["category"] = "Color/Contrast"
        elif "mobile" in prob or "responsive" in prob or "viewport" in prob or "overflow" in prob:
            data["category"] = "Responsiveness"
        elif "aria" in prob or "accessible" in prob or "screen reader" in prob:
            data["category"] = "Accessibility"
        else:
            data["category"] = "Layout"

    # Normalize severity & verdict
    severity = str(data.get("severity", "Medium")).strip().capitalize()
    if severity not in ["Low", "Medium", "High", "Critical"]:
        severity = "Medium"
    data["severity"] = severity

    verdict = data.get("verdict")
    if not verdict:
        if severity == "Low" and ("no bug" in str(data.get("problem", "")).lower() or "looks good" in str(data.get("problem", "")).lower()):
            verdict = "NO_BUG"
        elif severity in ["High", "Critical"]:
            verdict = "BUG_DETECTED"
        else:
            verdict = "POTENTIAL_ISSUE"
    data["verdict"] = verdict

    # Normalize confidence & confidence_pct
    conf = str(data.get("confidence", "High")).strip().capitalize()
    if conf not in ["Low", "Medium", "High"]:
        conf = "High"
    data["confidence"] = conf

    if "confidence_pct" not in data or not isinstance(data.get("confidence_pct"), (int, float)):
        data["confidence_pct"] = 92 if conf == "High" else (76 if conf == "Medium" else 52)
    else:
        data["confidence_pct"] = max(0, min(100, int(data["confidence_pct"])))

    # Normalize ui_health_score
    if "ui_health_score" not in data or not isinstance(data.get("ui_health_score"), (int, float)):
        if verdict == "NO_BUG":
            data["ui_health_score"] = 96
        elif severity == "Critical":
            data["ui_health_score"] = 38
        elif severity == "High":
            data["ui_health_score"] = 58
        elif severity == "Medium":
            data["ui_health_score"] = 74
        else:
            data["ui_health_score"] = 88
    else:
        data["ui_health_score"] = max(0, min(100, int(data["ui_health_score"])))

    # Normalize issue_count
    if "issue_count" not in data or not isinstance(data.get("issue_count"), int):
        data["issue_count"] = 0 if verdict == "NO_BUG" else 1

    # Normalize quality_scores
    qs = data.get("quality_scores")
    if not isinstance(qs, dict):
        base = data["ui_health_score"]
        qs = {
            "layout": base,
            "consistency": min(100, base + 4),
            "spacing_alignment": max(0, base - 6),
            "typography": min(100, base + 8),
            "accessibility": max(0, base - 10),
            "responsiveness": None
        }
    data["quality_scores"] = qs

    # Normalize issue_categories
    if "issue_categories" not in data or not isinstance(data.get("issue_categories"), dict) or not data["issue_categories"]:
        if data["issue_count"] > 0:
            data["issue_categories"] = {data["category"]: data["issue_count"]}
        else:
            data["issue_categories"] = {}

    # Normalize observed_evidence
    evidence_list = data.get("observed_evidence", [])
    if isinstance(evidence_list, list):
        norm_evidence = []
        for item in evidence_list:
            if isinstance(item, dict):
                norm_evidence.append({
                    "category": item.get("category", data["category"]),
                    "evidence": item.get("evidence", str(item)),
                    "status": item.get("status", "warning" if severity in ["Medium", "High", "Critical"] else "ok")
                })
            elif isinstance(item, str):
                status = "defect" if ("error" in item.lower() or "broken" in item.lower() or "overlap" in item.lower()) else ("warning" if ("align" in item.lower() or "uneven" in item.lower()) else "ok")
                norm_evidence.append({
                    "category": data["category"],
                    "evidence": item,
                    "status": status
                })
        data["observed_evidence"] = norm_evidence

    # Normalize likely_causes
    causes_list = data.get("likely_causes", [])
    if isinstance(causes_list, list):
        norm_causes = []
        for item in causes_list:
            if isinstance(item, dict):
                norm_causes.append({
                    "cause": item.get("cause", str(item)),
                    "confidence": item.get("confidence", "Medium")
                })
            elif isinstance(item, str):
                norm_causes.append({
                    "cause": item,
                    "confidence": "Medium"
                })
        data["likely_causes"] = norm_causes

    # Normalize investigation_points
    points_list = data.get("investigation_points", [])
    if isinstance(points_list, list):
        norm_points = []
        for idx, item in enumerate(points_list):
            priority = "HIGH" if idx == 0 else ("MEDIUM" if idx == 1 else "LOW")
            if isinstance(item, dict):
                norm_points.append({
                    "point": item.get("point", str(item)),
                    "priority": item.get("priority", priority)
                })
            elif isinstance(item, str):
                norm_points.append({
                    "point": item,
                    "priority": priority
                })
        data["investigation_points"] = norm_points

    # Normalize suggested_fix
    fix = data.get("suggested_fix")
    if isinstance(fix, str):
        data["suggested_fix"] = {
            "action": fix,
            "priority": "HIGH" if severity in ["High", "Critical"] else "MEDIUM"
        }
    elif not isinstance(fix, dict):
        data["suggested_fix"] = {
            "action": "Review visual discrepancies against design tokens and DOM hierarchy.",
            "priority": "MEDIUM"
        }

    # Normalize fix_verification if present
    if "fix_verification" in data and isinstance(data["fix_verification"], dict):
        fv = data["fix_verification"]
        b_score = fv.get("before_ui_health_score", data["ui_health_score"])
        a_score = fv.get("after_ui_health_score", min(100, b_score + 25) if fv.get("fix_status") == "FIXED" else b_score)
        imp_score = fv.get("improvement_score", a_score - b_score)
        
        fv["before_ui_health_score"] = int(b_score)
        fv["after_ui_health_score"] = int(a_score)
        fv["improvement_score"] = int(imp_score)
        
        comp_conf = fv.get("comparison_confidence", "High")
        fv["comparison_confidence"] = comp_conf
        fv["comparison_confidence_pct"] = fv.get("comparison_confidence_pct", 94 if comp_conf == "High" else 78)

    return data


import io
import time
from PIL import Image


def optimize_image_bytes(image_bytes: bytes, mime_type: str = "image/png") -> tuple[bytes, str]:
    """
    Ensure the screenshot is within safe dimensions/size for Gemma 4
    to prevent upstream 500 INTERNAL errors on large screenshots.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        orig_w, orig_h = img.size
        max_dim = 1600
        if orig_w > max_dim or orig_h > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            if img.mode in ("RGBA", "P"):
                img.save(output, format="PNG", optimize=True)
                return output.getvalue(), "image/png"
            else:
                img.save(output, format="JPEG", quality=90, optimize=True)
                return output.getvalue(), "image/jpeg"
        return image_bytes, mime_type
    except Exception:
        return image_bytes, mime_type


@app.route("/api/analyze", methods=["POST"])
def analyze_ui():
    """
    Endpoint for multimodal UI bug analysis using Gemma 4.
    Expects JSON payload with:
      - image_data: base64-encoded Before / Current image string or data URI (Required)
      - mime_type: image MIME type (e.g. 'image/png', 'image/jpeg', 'image/webp')
      - description: developer's description of the UI bug (Required)
      - after_image_data: base64-encoded After Fix image string (Optional)
      - after_mime_type: MIME type of After Fix image (Optional)
    """
    api_key = get_gemini_api_key()
    if not api_key:
        return jsonify({
            "error": "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your local .env file."
        }), 400

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request: JSON body required."}), 400

    image_data = data.get("image_data")
    mime_type = data.get("mime_type", "image/png")
    description = data.get("description", "").strip()

    after_image_data = data.get("after_image_data")
    after_mime_type = data.get("after_mime_type", "image/png")

    if not image_data:
        return jsonify({"error": "Missing image_data: Please upload a UI screenshot."}), 400

    if not description:
        return jsonify({"error": "Missing description: Please describe what seems to be wrong."}), 400

    try:
        # Import the official Google GenAI SDK
        from google import genai
        from google.genai import types

        # Initialize the GenAI client with the environment variable key
        client = genai.Client(api_key=api_key)

        # 1. Process Before / Current UI image
        if "," in image_data:
            header, base64_payload = image_data.split(",", 1)
            mime_match = re.search(r"data:([^;]+);base64", header)
            if mime_match:
                mime_type = mime_match.group(1)
        else:
            base64_payload = image_data

        image_bytes = base64.b64decode(base64_payload)
        opt_bytes, opt_mime = optimize_image_bytes(image_bytes, mime_type)

        before_image_part = types.Part.from_bytes(
            data=opt_bytes,
            mime_type=opt_mime
        )

        # 2. Check if After Fix image is provided
        has_after_image = bool(after_image_data and after_image_data.strip())
        
        if has_after_image:
            # Process After Fix image
            if "," in after_image_data:
                after_header, after_base64_payload = after_image_data.split(",", 1)
                after_mime_match = re.search(r"data:([^;]+);base64", after_header)
                if after_mime_match:
                    after_mime_type = after_mime_match.group(1)
            else:
                after_base64_payload = after_image_data

            after_image_bytes = base64.b64decode(after_base64_payload)
            opt_after_bytes, opt_after_mime = optimize_image_bytes(after_image_bytes, after_mime_type)

            after_image_part = types.Part.from_bytes(
                data=opt_after_bytes,
                mime_type=opt_after_mime
            )

            # Build comparison & verification prompt
            analysis_prompt = f"""You are BugLens, a multimodal UI debugging and fix verification assistant for developers.

You are supplied with two UI screenshots:
1. BEFORE / Current UI screenshot (showing the reported issue)
2. AFTER Fix screenshot (showing the attempted fix)

Developer's description:
"{description}"

Do not assume that the developer's description is correct. Examine the visual evidence in both screenshots.

Analyze the bug in the BEFORE screenshot, compare it thoroughly with the AFTER screenshot, and verify the fix.

Return a structured JSON analysis containing:
1. "problem": string summary of the core issue observed in the Before screenshot
2. "verdict": "NO_BUG" | "POTENTIAL_ISSUE" | "BUG_DETECTED"
3. "category": primary UI issue category chosen strictly from: "Layout", "Spacing", "Alignment", "Typography", "Color/Contrast", "Responsiveness", "Accessibility", or "Other"
4. "severity": "Low", "Medium", "High", or "Critical"
5. "confidence": "Low", "Medium", or "High"
6. "confidence_pct": integer 0-100 representing certainty in the diagnosis
7. "ui_health_score": integer 0-100 overall visual quality score for the Before screenshot (100 = flawless, <50 = broken)
8. "issue_count": integer (number of distinct issues identified in the Before screenshot, 0 if no bug)
9. "quality_scores": an object with scores 0-100 (or null if not determinable from the single viewport):
   - "layout": integer 0-100 or null
   - "consistency": integer 0-100 or null
   - "spacing_alignment": integer 0-100 or null
   - "typography": integer 0-100 or null
   - "accessibility": integer 0-100 or null
   - "responsiveness": integer 0-100 or null
10. "issue_categories": an object with counts of detected issues per category, e.g. {{"Layout": 1, "Spacing": 1}} or empty object if none
11. "observed_evidence": array of objects:
    - "category": string (e.g. "Layout", "Spacing", "Alignment", "Typography", "Color/Contrast")
    - "evidence": string (concise 1-sentence visual observation)
    - "status": "ok" | "warning" | "defect"
12. "likely_causes": array of objects:
    - "cause": string (concise root cause, e.g. "Flexbox child overflow with flex-shrink: 0")
    - "confidence": "Low" | "Medium" | "High"
13. "investigation_points": array of objects:
    - "point": string (concise check item, e.g. "Check .btn-group display and margin properties")
    - "priority": "HIGH" | "MEDIUM" | "LOW"
14. "suggested_fix": an object:
    - "action": string (concise actionable fix recommendation)
    - "priority": "HIGH" | "MEDIUM" | "LOW"
15. "fix_verification": an object with:
    - "original_issue": string (summary of the original issue)
    - "before_ui_health_score": integer 0-100
    - "after_ui_health_score": integer 0-100
    - "improvement_score": integer (after_ui_health_score - before_ui_health_score, can be positive or negative)
    - "fix_status": "FIXED", "PARTIALLY_FIXED", "NOT_FIXED", or "REGRESSION"
    - "fix_explanation": string (concise evaluation of whether and how the fix succeeded or failed)
    - "changes_detected": array of strings (specific visual changes detected)
    - "remaining_issues": array of strings (remaining issues from original bug, empty if none)
    - "new_issues_introduced": array of strings (new visual bugs or regressions introduced, empty if none)
    - "comparison_confidence": "Low", "Medium", or "High"
    - "comparison_confidence_pct": integer 0-100

Distinguish clearly between what is visibly observed and what is inferred.
Return ONLY a valid JSON object matching this structure."""

            model_contents = [before_image_part, after_image_part, analysis_prompt]

        else:
            # Single-image standard BugLens analysis prompt
            analysis_prompt = f"""You are BugLens, a UI debugging assistant for developers.

Analyze the supplied UI screenshot together with the developer's description.

Developer's description:
"{description}"

Do not assume that the developer's description is correct. Examine the visual evidence first.

Return a structured JSON analysis containing:
1. "problem": string summary of the core issue
2. "verdict": "NO_BUG" | "POTENTIAL_ISSUE" | "BUG_DETECTED"
3. "category": primary UI issue category chosen strictly from: "Layout", "Spacing", "Alignment", "Typography", "Color/Contrast", "Responsiveness", "Accessibility", or "Other"
4. "severity": "Low", "Medium", "High", or "Critical"
5. "confidence": "Low", "Medium", or "High"
6. "confidence_pct": integer 0-100 representing certainty in the diagnosis
7. "ui_health_score": integer 0-100 overall visual quality score (100 = flawless, <50 = broken)
8. "issue_count": integer (number of distinct issues identified, 0 if no bug)
9. "quality_scores": an object with scores 0-100 (or null if not determinable from the single viewport):
   - "layout": integer 0-100 or null
   - "consistency": integer 0-100 or null
   - "spacing_alignment": integer 0-100 or null
   - "typography": integer 0-100 or null
   - "accessibility": integer 0-100 or null
   - "responsiveness": integer 0-100 or null
10. "issue_categories": an object with counts of detected issues per category, e.g. {{"Layout": 1, "Spacing": 1}} or empty object if none
11. "observed_evidence": array of objects:
    - "category": string (e.g. "Layout", "Spacing", "Alignment", "Typography", "Color/Contrast")
    - "evidence": string (concise 1-sentence visual observation)
    - "status": "ok" | "warning" | "defect"
12. "likely_causes": array of objects:
    - "cause": string (concise root cause)
    - "confidence": "Low" | "Medium" | "High"
13. "investigation_points": array of objects:
    - "point": string (concise check item)
    - "priority": "HIGH" | "MEDIUM" | "LOW"
14. "suggested_fix": an object:
    - "action": string (concise actionable fix recommendation)
    - "priority": "HIGH" | "MEDIUM" | "LOW"

Distinguish clearly between what is visibly observed and what is inferred.
If the screenshot shows a normal, bug-free interface matching the description, set verdict="NO_BUG", severity="Low", ui_health_score=95-100, and issue_count=0.
Return ONLY a valid JSON object matching this structure."""

            model_contents = [before_image_part, analysis_prompt]

        # Resolve model name from environment variable (default: gemma-4-31b-it)
        primary_model = os.environ.get("GEMMA_MODEL", "gemma-4-31b-it").strip() or "gemma-4-31b-it"

        # Model hierarchy: Try primary model first; if temporary capacity/500 occurs, retry or fall back smoothly
        models_to_try = [primary_model]
        if primary_model == "gemma-4-31b-it":
            models_to_try.append("gemma-4-26b-a4b-it")
            models_to_try.append("gemini-2.5-flash")

        response = None
        used_model = primary_model
        last_error = None

        for m in models_to_try:
            for attempt in range(2):
                try:
                    response = client.models.generate_content(
                        model=m,
                        contents=model_contents,
                    )
                    used_model = m
                    break
                except Exception as ex:
                    last_error = ex
                    err_str = str(ex).lower()
                    if "500" in err_str or "503" in err_str or "internal" in err_str or "unavailable" in err_str:
                        time.sleep(1.0)
                        continue
                    else:
                        break
            if response is not None:
                break

        if response is None:
            raise last_error

        response_text = response.text if hasattr(response, "text") else str(response)
        parsed_result = parse_structured_response(response_text)

        return jsonify({
            "status": "success",
            "model": used_model,
            "has_verification": has_after_image,
            "analysis": parsed_result
        })

    except Exception as e:
        error_message = str(e)
        return jsonify({
            "error": f"Analysis request failed: {error_message}"
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"BugLens server running at http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
