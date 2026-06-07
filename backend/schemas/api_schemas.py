from pydantic import BaseModel, ConfigDict
from typing import Optional


# SCHEMATY DLA TABLETU (KIOSKU)

class QRCodeResponse(BaseModel):
    qr_token: str
    expires_in_seconds: int


# SCHEMATY DLA MOBILKI (PACJENTA)

class JoinQueueRequest(BaseModel):
    code: str

class JoinQueueResponse(BaseModel):
    patient_id: str
    queue_position: int
    estimated_wait_time_minutes: int


# SCHEMATY DLA PANELU ADMINA (WEB)

class TabletCreate(BaseModel):
    name: str
    location: str
    service_point_id: Optional[int] = None

class TabletResponse(BaseModel):
    id: int
    name: str
    location: str
    service_point_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# SCHEMATY DLA LOGOWANIA (AUTH)

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"