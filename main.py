from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from sqlalchemy import Column, Integer, String, Text, DateTime, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn
import datetime
import os
import shutil
from pydantic import BaseModel

class TarefaUpdate(BaseModel):
    status: Optional[str] = None
    descricao: Optional[str] = None

# Garante que a pasta de uploads exista
os.makedirs("uploads", exist_ok=True)

# Configuração do Banco de Dados MySQL
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:admin@db:3306/erp_banco"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODELOS DO BANCO DE DADOS (AGORA COM LIMITE DE CARACTERES PARA O MYSQL) ---
class UsuarioDB(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255))
    setor = Column(String(100))
    login = Column(String(100), unique=True, index=True)
    senha = Column(String(255))

class TarefaDB(Base):
    __tablename__ = "tarefas"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(255))
    setor_origem = Column(String(100))
    setor_destino = Column(String(100))
    descricao = Column(Text)
    responsavel = Column(String(100), default="Pendente")
    status = Column(String(50), default="todo")
    link_flip = Column(String(255), nullable=True)

class ComentarioDB(Base):
    __tablename__ = "comentarios_tarefas"
    id = Column(Integer, primary_key=True, index=True)
    tarefa_id = Column(Integer, index=True)
    autor = Column(String(100))
    texto = Column(Text)
    arquivo = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class MensagemPrivadaDB(Base):
    __tablename__ = "chat_privado"
    id = Column(Integer, primary_key=True, index=True)
    remetente = Column(String(100))
    destinatario = Column(String(100))
    texto = Column(Text)
    arquivo = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

# Cria as tabelas automaticamente se não existirem
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- ROTAS DE USUÁRIOS ---
@app.post("/usuarios/")
def criar_usuario(nome: str, setor: str, login: str, senha: str, db: Session = Depends(get_db)):
    existe = db.query(UsuarioDB).filter(UsuarioDB.login == login).first()
    if existe:
        raise HTTPException(status_code=400, detail="Login ja existe")
        
    novo = UsuarioDB(nome=nome, setor=setor, login=login, senha=senha)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@app.get("/usuarios/")
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(UsuarioDB).all()

@app.delete("/usuarios/{user_id}")
def excluir_usuario(user_id: int, db: Session = Depends(get_db)):
    user = db.query(UsuarioDB).filter(UsuarioDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    db.delete(user)
    db.commit()
    return {"message": "Usuário removido com sucesso"}

@app.post("/login/")
def login(login_user: str, senha_user: str, db: Session = Depends(get_db)):
    user = db.query(UsuarioDB).filter(UsuarioDB.login == login_user, UsuarioDB.senha == senha_user).first()
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    return {"nome": user.nome, "setor": user.setor}

# --- ROTAS DE TAREFAS ---
@app.get("/tarefas/")
def listar_tarefas(db: Session = Depends(get_db)):
    return db.query(TarefaDB).all()

@app.post("/tarefas/")
async def criar_tarefa(
    titulo: str = Form(...),
    setor_destino: str = Form(...),
    descricao: str = Form(...),
    responsavel: str = Form(...),
    setor_origem: str = Form(...),
    link_flip: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    nova = TarefaDB(
        titulo=titulo,
        setor_destino=setor_destino,
        descricao=descricao,
        responsavel=responsavel,
        setor_origem=setor_origem,
        link_flip=link_flip
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova

@app.patch("/tarefas/{tarefa_id}")
def atualizar_tarefa(tarefa_id: int, data: TarefaUpdate, db: Session = Depends(get_db)):
    t = db.query(TarefaDB).filter(TarefaDB.id == tarefa_id).first()
    if t:
        if data.status is not None:
            t.status = data.status
        if data.descricao is not None:
            t.descricao = data.descricao
        db.commit()
        db.refresh(t)
        return t
    raise HTTPException(status_code=404, detail="Tarefa não encontrada")

# --- ROTAS DE COMENTÁRIOS DO CARD ---
@app.get("/tarefas/{tarefa_id}/comentarios/")
def listar_coments(tarefa_id: int, db: Session = Depends(get_db)):
    return db.query(ComentarioDB).filter(ComentarioDB.tarefa_id == tarefa_id).all()

@app.post("/tarefas/{tarefa_id}/comentarios/")
def add_comentario(
    tarefa_id: int,
    autor: str = Form(...),
    texto: str = Form(...),
    arquivo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    path = None
    if arquivo and arquivo.filename:
        path = f"uploads/{arquivo.filename}"
        with open(path, "wb") as buffer:
            shutil.copyfileobj(arquivo.file, buffer)
    novo = ComentarioDB(tarefa_id=tarefa_id, autor=autor, texto=texto, arquivo=path)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

# --- ROTAS DO CHAT PRIVADO ---
@app.get("/chat_privado/")
def ler_chat_privado(usuario1: str, usuario2: str, db: Session = Depends(get_db)):
    return db.query(MensagemPrivadaDB).filter(
        ((MensagemPrivadaDB.remetente == usuario1) & (MensagemPrivadaDB.destinatario == usuario2)) |
        ((MensagemPrivadaDB.remetente == usuario2) & (MensagemPrivadaDB.destinatario == usuario1))
    ).order_by(MensagemPrivadaDB.timestamp.asc()).all()

@app.post("/chat_privado/")
def post_chat_privado(
    remetente: str = Form(...),
    destinatario: str = Form(...),
    texto: str = Form(...),
    arquivo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    path = None
    if arquivo and arquivo.filename:
        path = f"uploads/{arquivo.filename}"
        with open(path, "wb") as buffer:
            shutil.copyfileobj(arquivo.file, buffer)
            
    m = MensagemPrivadaDB(remetente=remetente, destinatario=destinatario, texto=texto, arquivo=path)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)