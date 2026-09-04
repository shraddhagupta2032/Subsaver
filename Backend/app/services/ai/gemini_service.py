import os
import json
import re
from typing import Optional, Dict, Any, Callable
from fastapi import HTTPException, status

_mock_extractor: Optional[Callable[[bytes, str], Dict[str, Any]]] = None


def set_mock_gemini_extractor(fn: Optional[Callable[[bytes, str], Dict[str, Any]]]):
    global _mock_extractor
    _mock_extractor = fn


def reset_mock_gemini_extractor():
    global _mock_extractor
    _mock_extractor = None


def get_gemini_api_key() -> Optional[str]:
    return os.getenv("GEMINI_API_KEY")


def extract_bill_data_from_image(image_bytes: bytes, mime_type: str) -> Dict[str, Any]:
    # 1. Check if test mock extractor is active
    if _mock_extractor is not None:
        return _mock_extractor(image_bytes, mime_type)

    api_key = get_gemini_api_key()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI bill scanning service is currently not configured (GEMINI_API_KEY missing)."
        )

    try:
        import google.generativeai as genai
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI bill scanning dependencies are not available on the server."
        )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        system_instruction = """
        You are an expert OCR and financial document analyzer. Extract structured financial data from the provided bill/receipt/invoice image.
        
        Respond with ONLY a valid JSON object adhering strictly to this schema:
        {
          "merchant_name": "string or null",
          "total_amount": "string or number representing the monetary total (e.g. 649.00), or null",
          "currency": "3-letter currency code such as INR, USD, EUR or null",
          "bill_date": "YYYY-MM-DD format or null",
          "due_date": "YYYY-MM-DD format or null",
          "category": "Entertainment, Groceries, Food & Dining, Utilities, Transport, Software, Fitness, Healthcare, General, or null",
          "description": "Short brief summary or item name, or null",
          "billing_cycle": "MONTHLY, YEARLY, WEEKLY, CUSTOM, or null if not a recurring subscription",
          "next_renewal_date": "YYYY-MM-DD format if subscription, or null",
          "document_type": "EXPENSE (for one-time bills/receipts) or SUBSCRIPTION (for recurring plans) or UNKNOWN",
          "confidence": 0.95 (a float between 0.0 and 1.0 indicating extraction quality)
        }
        Do not wrap in markdown code blocks. Output pure raw JSON.
        """

        response = model.generate_content(
            contents=[
                {"mime_type": mime_type, "data": image_bytes},
                system_instruction
            ]
        )

        response_text = response.text.strip()
        # Clean any potential ```json markdown wrapper
        if response_text.startswith("```"):
            response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
            response_text = re.sub(r"\s*```$", "", response_text)

        parsed_data = json.loads(response_text)
        return parsed_data

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not parse structured financial data from the AI response."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI bill scanning service is temporarily unavailable: {str(e)}"
        )
