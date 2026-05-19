from pydantic import BaseModel


# SCHEMATY DLA TABLETU

class QRCodeResponse(BaseModel):
    qr_token: str
    expires_in_seconds: int


# SCHEMATY DLA MOBILKI

class JoinQueueRequest(BaseModel):
    qr_token: str

class JoinQueueResponse(BaseModel):
    patient_id: str
    queue_position: int
    estimated_wait_time_minutes: int