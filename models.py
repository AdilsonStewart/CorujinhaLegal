"""
Modelos de dados para o sistema CorujinhaLegal
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Message(db.Model):
    """
    Modelo para armazenar mensagens de áudio/vídeo agendadas
    """
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Informações do cliente
    client_name = db.Column(db.String(200), nullable=False)
    client_email = db.Column(db.String(200), nullable=False)
    
    # Informações da mensagem
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)
    
    # Tipo de mídia: 'audio' ou 'video'
    media_type = db.Column(db.String(10), nullable=False)
    
    # Caminho do arquivo no sistema
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(300), nullable=False)
    file_size = db.Column(db.Integer)  # Tamanho em bytes
    
    # Datas
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    delivery_date = db.Column(db.DateTime, nullable=False)
    
    # Status da entrega
    delivered = db.Column(db.Boolean, default=False, nullable=False)
    delivered_at = db.Column(db.DateTime)
    
    def to_dict(self):
        """Converte o objeto para dicionário"""
        return {
            'id': self.id,
            'client_name': self.client_name,
            'client_email': self.client_email,
            'title': self.title,
            'description': self.description,
            'media_type': self.media_type,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'delivery_date': self.delivery_date.isoformat() if self.delivery_date else None,
            'delivered': self.delivered,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None
        }
    
    def __repr__(self):
        return f'<Message {self.id}: {self.title}>'
