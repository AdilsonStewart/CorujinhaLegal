"""
Serviço de agendamento e entrega de mensagens
"""
import os
import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from models import db, Message

logger = logging.getLogger(__name__)

class MessageScheduler:
    """
    Gerenciador de agendamento de mensagens
    """
    
    def __init__(self, app=None):
        self.scheduler = BackgroundScheduler()
        self.app = app
        
    def init_app(self, app):
        """Inicializa o scheduler com a aplicação Flask"""
        self.app = app
        
        # Adiciona job para verificar mensagens pendentes a cada minuto
        self.scheduler.add_job(
            func=self.check_pending_deliveries,
            trigger="interval",
            minutes=1,
            id='check_deliveries',
            name='Verificar entregas pendentes',
            replace_existing=True
        )
        
        self.scheduler.start()
        logger.info("Scheduler de mensagens iniciado")
        
    def check_pending_deliveries(self):
        """Verifica e processa mensagens que devem ser entregues"""
        if not self.app:
            return
            
        with self.app.app_context():
            try:
                now = datetime.utcnow()
                
                # Busca mensagens não entregues com data de entrega já passada
                pending_messages = Message.query.filter(
                    Message.delivered == False,
                    Message.delivery_date <= now
                ).all()
                
                for message in pending_messages:
                    self.deliver_message(message)
                    
            except Exception as e:
                logger.error(f"Erro ao verificar entregas pendentes: {str(e)}")
    
    def deliver_message(self, message):
        """
        Processa a entrega de uma mensagem
        
        Em uma implementação real, isso poderia:
        - Enviar email com link para download
        - Enviar notificação push
        - Chamar webhook
        - etc.
        
        Por enquanto, apenas marca como entregue e registra no log
        """
        try:
            logger.info(f"Entregando mensagem ID {message.id} - {message.title}")
            
            # Simula processo de entrega
            # Aqui você implementaria a lógica real de entrega
            # Por exemplo: enviar email, notificação, etc.
            
            # Marca como entregue
            message.delivered = True
            message.delivered_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"Mensagem ID {message.id} entregue com sucesso para {message.client_email}")
            
        except Exception as e:
            logger.error(f"Erro ao entregar mensagem ID {message.id}: {str(e)}")
            db.session.rollback()
    
    def shutdown(self):
        """Desliga o scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scheduler desligado")
