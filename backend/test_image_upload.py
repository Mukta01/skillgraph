import asyncio
from app.services.ai_service import extract_skills_from_resume

async def main():
    try:
        print("Testing image upload...")
        # Create a tiny valid PNG file in memory
        png_magic = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        
        result = await extract_skills_from_resume(
            file_bytes=png_magic,
            mime_type="image/png"
        )
        print("Success:", result)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
