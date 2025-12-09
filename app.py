"""
Aplicação principal CorujinhaLegal
Sistema de gravação e agendamento de mensagens em áudio/vídeo
"""
import os
import logging
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dateutil import parser

from config import Config
from models import db, Message
from scheduler import MessageScheduler

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Criar aplicação Flask
app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Inicializar banco de dados
db.init_app(app)

# Inicializar scheduler
message_scheduler = MessageScheduler()

def allowed_file(filename, file_type):
    """Verifica se a extensão do arquivo é permitida"""
    if '.' not in filename:
        return False
    
    ext = filename.rsplit('.', 1)[1].lower()
    
    if file_type == 'audio':
        return ext in app.config['ALLOWED_AUDIO_EXTENSIONS']
    elif file_type == 'video':
        return ext in app.config['ALLOWED_VIDEO_EXTENSIONS']
    
    return False

@app.route('/')
def index():
    """Rota principal"""
    return jsonify({
        'message': 'CorujinhaLegal - Sistema de Mensagens Agendadas',
        'version': '1.0.0',
        'endpoints': {
            'POST /api/messages': 'Criar nova mensagem com áudio/vídeo',
            'GET /api/messages': 'Listar todas as mensagens',
            'GET /api/messages/<id>': 'Obter detalhes de uma mensagem',
            'DELETE /api/messages/<id>': 'Deletar uma mensagem',
            'GET /api/messages/<id>/download': 'Baixar arquivo da mensagem'
        }
    })

@app.route('/api/messages', methods=['POST'])
def create_message():
    """
    Cria uma nova mensagem com arquivo de áudio ou vídeo
    
    Espera dados multipart/form-data com:
    - file: arquivo de áudio ou vídeo
    - client_name: nome do cliente
    - client_email: email do cliente
    - title: título da mensagem
    - description: descrição (opcional)
    - media_type: 'audio' ou 'video'
    - delivery_date: data de entrega no formato ISO 8601
    """
    try:
        # Validar arquivo
        if 'file' not in request.files:
            return jsonify({'error': 'Nenhum arquivo foi enviado'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
        # Validar campos obrigatórios
        required_fields = ['client_name', 'client_email', 'title', 'media_type', 'delivery_date']
        for field in required_fields:
            if field not in request.form:
                return jsonify({'error': f'Campo obrigatório ausente: {field}'}), 400
        
        media_type = request.form['media_type']
        if media_type not in ['audio', 'video']:
            return jsonify({'error': 'media_type deve ser "audio" ou "video"'}), 400
        
        # Validar extensão do arquivo
        if not allowed_file(file.filename, media_type):
            allowed = app.config['ALLOWED_AUDIO_EXTENSIONS'] if media_type == 'audio' else app.config['ALLOWED_VIDEO_EXTENSIONS']
            return jsonify({'error': f'Formato de arquivo não permitido. Formatos aceitos: {", ".join(allowed)}'}), 400
        
        # Validar e parsear data de entrega
        try:
            delivery_date = parser.parse(request.form['delivery_date'])
            # Garantir que a data seja timezone-aware
            if delivery_date.tzinfo is None:
                delivery_date = delivery_date.replace(tzinfo=timezone.utc)
            
            if delivery_date < datetime.now(timezone.utc):
                return jsonify({'error': 'Data de entrega deve ser no futuro'}), 400
        except Exception as e:
            return jsonify({'error': f'Formato de data inválido: {str(e)}'}), 400
        
        # Criar diretório de uploads se não existir
        if not os.path.exists(app.config['UPLOAD_FOLDER']):
            os.makedirs(app.config['UPLOAD_FOLDER'])
        
        # Salvar arquivo com nome seguro
        filename = secure_filename(file.filename)
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        
        # Criar registro no banco de dados
        message = Message(
            client_name=request.form['client_name'],
            client_email=request.form['client_email'],
            title=request.form['title'],
            description=request.form.get('description', ''),
            media_type=media_type,
            file_path=file_path,
            file_name=unique_filename,
            file_size=file_size,
            delivery_date=delivery_date
        )
        
        db.session.add(message)
        db.session.commit()
        
        logger.info(f"Nova mensagem criada: ID {message.id} - {message.title}")
        
        return jsonify({
            'message': 'Mensagem criada com sucesso',
            'data': message.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"Erro ao criar mensagem: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'Erro ao criar mensagem: {str(e)}'}), 500

@app.route('/api/messages', methods=['GET'])
def list_messages():
    """Lista todas as mensagens"""
    try:
        # Parâmetros de filtro opcionais
        delivered = request.args.get('delivered')
        
        query = Message.query
        
        if delivered is not None:
            delivered_bool = delivered.lower() in ['true', '1', 'yes']
            query = query.filter_by(delivered=delivered_bool)
        
        messages = query.order_by(Message.created_at.desc()).all()
        
        return jsonify({
            'total': len(messages),
            'messages': [msg.to_dict() for msg in messages]
        }), 200
        
    except Exception as e:
        logger.error(f"Erro ao listar mensagens: {str(e)}")
        return jsonify({'error': f'Erro ao listar mensagens: {str(e)}'}), 500

@app.route('/api/messages/<int:message_id>', methods=['GET'])
def get_message(message_id):
    """Obtém detalhes de uma mensagem específica"""
    try:
        message = db.session.get(Message, message_id)
        
        if not message:
            return jsonify({'error': 'Mensagem não encontrada'}), 404
        
        return jsonify(message.to_dict()), 200
        
    except Exception as e:
        logger.error(f"Erro ao obter mensagem: {str(e)}")
        return jsonify({'error': f'Erro ao obter mensagem: {str(e)}'}), 500

@app.route('/api/messages/<int:message_id>', methods=['DELETE'])
def delete_message(message_id):
    """Deleta uma mensagem"""
    try:
        message = db.session.get(Message, message_id)
        
        if not message:
            return jsonify({'error': 'Mensagem não encontrada'}), 404
        
        # Deletar arquivo físico
        if os.path.exists(message.file_path):
            os.remove(message.file_path)
        
        # Deletar registro do banco
        db.session.delete(message)
        db.session.commit()
        
        logger.info(f"Mensagem deletada: ID {message_id}")
        
        return jsonify({'message': 'Mensagem deletada com sucesso'}), 200
        
    except Exception as e:
        logger.error(f"Erro ao deletar mensagem: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'Erro ao deletar mensagem: {str(e)}'}), 500

@app.route('/api/messages/<int:message_id>/download', methods=['GET'])
def download_message(message_id):
    """Baixa o arquivo de áudio/vídeo de uma mensagem"""
    try:
        message = db.session.get(Message, message_id)
        
        if not message:
            return jsonify({'error': 'Mensagem não encontrada'}), 404
        
        if not os.path.exists(message.file_path):
            return jsonify({'error': 'Arquivo não encontrado'}), 404
        
        return send_file(
            message.file_path,
            as_attachment=True,
            download_name=message.file_name
        )
        
    except Exception as e:
        logger.error(f"Erro ao baixar arquivo: {str(e)}")
        return jsonify({'error': f'Erro ao baixar arquivo: {str(e)}'}), 500

def init_db():
    """Inicializa o banco de dados"""
    with app.app_context():
        db.create_all()
        logger.info("Banco de dados inicializado")

if __name__ == '__main__':
    # Inicializar banco de dados
    init_db()
    
    # Inicializar scheduler
    message_scheduler.init_app(app)
    
    # Determinar modo debug a partir de variável de ambiente
    # Por padrão, debug está desativado por segurança
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 'yes')
    
    # Executar aplicação
    try:
        app.run(host='0.0.0.0', port=5000, debug=debug_mode)
    finally:
        message_scheduler.shutdown()
