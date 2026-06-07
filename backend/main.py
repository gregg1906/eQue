from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from auth import verify_password, create_access_token

from schemas.api_schemas import (
    QRCodeResponse, JoinQueueRequest, JoinQueueResponse, 
    TabletResponse, TabletCreate, LoginRequest, TokenResponse
)

app = FastAPI(
    title="eQue API",
    description="Backend aplikacji eQue",
    version="1.0.0"
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/", tags=["default"])
async def root():
    return {"message": "Witaj w eQue API. Serwer działa poprawnie."}


# ENDPOINTY LOGOWANIA (AUTH)

@app.post("/api/v1/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Weryfikuje poświadczenia i zwraca token JWT dla administratora."""
    # 1. Szukamy admina w bazie po loginie
    admin = db.query(models.Admin).filter(models.Admin.username == login_data.username).first()
    
    
    if not admin:
        raise HTTPException(status_code=401, detail="Nieprawidłowy login lub hasło")
        
    # 2. Sprawdzamy hasło
    if not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Nieprawidłowy login lub hasło")
        
    # 3. Jeśli wszystko się zgadza, generujemy token
    access_token = create_access_token(data={"sub": admin.username})
    
    return {"access_token": access_token, "token_type": "bearer"}


# ENDPOINTY DLA TABLETU (KIOSKU)

@app.get("/api/v1/kiosk/qr", response_model=QRCodeResponse, tags=["Tablet"])
async def get_new_qr_code():
    return {"qr_token": "mock_uuid_123456789", "expires_in_seconds": 30}


# ENDPOINTY DLA MOBILKI (PACJENTA)

@app.post("/api/v1/queue/join", response_model=JoinQueueResponse, tags=["Patient"])
async def join_queue(request: JoinQueueRequest):
    return {
        "patient_id": "patient_abc_999",
        "queue_position": 4,
        "estimated_wait_time_minutes": 60
    }


# ENDPOINTY DLA PANELU ADMINA (WEB)

@app.get("/api/v1/admin/tablets", response_model=list[TabletResponse], tags=["Admin"])
async def get_all_tablets(db: Session = Depends(get_db)):
    tablets = db.query(models.Tablet).all()
    return tablets

@app.post("/api/v1/admin/tablets", response_model=TabletResponse, tags=["Admin"])
async def create_tablet(tablet: TabletCreate, db: Session = Depends(get_db)):
    new_tablet = models.Tablet(**tablet.model_dump())
    db.add(new_tablet)
    db.commit()
    db.refresh(new_tablet)
    return new_tablet

@app.put("/api/v1/admin/tablets/{tablet_id}", response_model=TabletResponse, tags=["Admin"])
async def update_tablet(tablet_id: int, tablet_data: TabletCreate, db: Session = Depends(get_db)):
    tablet = db.query(models.Tablet).filter(models.Tablet.id == tablet_id).first()
    if not tablet:
        raise HTTPException(status_code=404, detail="Tablet nie został znaleziony")
    tablet.name = tablet_data.name
    tablet.location = tablet_data.location
    tablet.service_point_id = tablet_data.service_point_id
    db.commit()
    db.refresh(tablet)
    return tablet

@app.delete("/api/v1/admin/tablets/{tablet_id}", tags=["Admin"])
async def delete_tablet(tablet_id: int, db: Session = Depends(get_db)):
    tablet = db.query(models.Tablet).filter(models.Tablet.id == tablet_id).first()
    if not tablet:
        raise HTTPException(status_code=404, detail="Tablet nie został znaleziony")
    db.delete(tablet)
    db.commit()
    return {"message": f"Tablet o ID {tablet_id} został usunięty."}