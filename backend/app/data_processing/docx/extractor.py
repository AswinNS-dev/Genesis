class DOCXExtractor:
    def extract_text(self, content: bytes) -> str:
        return content.decode("utf-8", errors="ignore")
