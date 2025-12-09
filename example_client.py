#!/usr/bin/env python3
"""
Cliente de exemplo para usar a API CorujinhaLegal
Demonstra como gravar e agendar uma mensagem
"""

import requests
import sys
import os
import tempfile
from datetime import datetime, timedelta, timezone

def create_scheduled_message(file_path, client_name, client_email, title, description, delivery_date):
    """
    Cria uma mensagem agendada
    
    Args:
        file_path: Caminho para o arquivo de áudio/vídeo
        client_name: Nome do cliente
        client_email: Email do cliente
        title: Título da mensagem
        description: Descrição da mensagem
        delivery_date: Data de entrega (formato ISO 8601 ou datetime)
    """
    
    # Determinar tipo de mídia pela extensão
    ext = file_path.lower().split('.')[-1]
    audio_exts = ['mp3', 'wav', 'ogg', 'aac', 'm4a']
    video_exts = ['mp4', 'avi', 'mov', 'mkv', 'webm']
    
    if ext in audio_exts:
        media_type = 'audio'
    elif ext in video_exts:
        media_type = 'video'
    else:
        print(f"❌ Erro: Formato de arquivo '{ext}' não suportado")
        return None
    
    # Converter data se necessário
    if isinstance(delivery_date, datetime):
        delivery_date = delivery_date.isoformat()
    
    # Preparar dados
    try:
        with open(file_path, 'rb') as f:
            files = {
                'file': (file_path.split('/')[-1], f, f'{"audio" if media_type == "audio" else "video"}/{ext}')
            }
            
            data = {
                'client_name': client_name,
                'client_email': client_email,
                'title': title,
                'description': description,
                'media_type': media_type,
                'delivery_date': delivery_date
            }
            
            # Enviar requisição
            print(f"📤 Enviando mensagem para CorujinhaLegal...")
            response = requests.post('http://localhost:5000/api/messages', files=files, data=data)
            
            if response.status_code == 201:
                result = response.json()
                print(f"✅ Mensagem criada com sucesso!")
                print(f"   ID: {result['data']['id']}")
                print(f"   Título: {result['data']['title']}")
                print(f"   Entrega agendada para: {result['data']['delivery_date']}")
                return result['data']
            else:
                print(f"❌ Erro ao criar mensagem: {response.json().get('error', 'Erro desconhecido')}")
                return None
                
    except FileNotFoundError:
        print(f"❌ Erro: Arquivo '{file_path}' não encontrado")
        return None
    except requests.exceptions.ConnectionError:
        print("❌ Erro: Não foi possível conectar ao servidor CorujinhaLegal")
        print("   Certifique-se de que o servidor está rodando em http://localhost:5000")
        return None
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return None

def list_messages(delivered=None):
    """Lista mensagens cadastradas"""
    try:
        url = 'http://localhost:5000/api/messages'
        if delivered is not None:
            url += f'?delivered={"true" if delivered else "false"}'
        
        response = requests.get(url)
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n📋 Total de mensagens: {result['total']}")
            
            for msg in result['messages']:
                status = "✅ Entregue" if msg['delivered'] else "⏳ Pendente"
                print(f"\n   ID: {msg['id']}")
                print(f"   Título: {msg['title']}")
                print(f"   Cliente: {msg['client_name']} ({msg['client_email']})")
                print(f"   Tipo: {msg['media_type']}")
                print(f"   Entrega: {msg['delivery_date']}")
                print(f"   Status: {status}")
            
            return result['messages']
        else:
            print(f"❌ Erro ao listar mensagens: {response.json().get('error', 'Erro desconhecido')}")
            return None
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return None

# Exemplo de uso
if __name__ == "__main__":
    print("=" * 60)
    print("CORUJINHALEGAL - Cliente de Exemplo")
    print("=" * 60)
    
    # Exemplo 1: Criar uma mensagem agendada
    print("\n📝 Exemplo de criação de mensagem agendada:\n")
    
    # Criar arquivo de exemplo para demonstração
    example_file = os.path.join(tempfile.gettempdir(), "exemplo_mensagem.mp3")
    with open(example_file, 'w') as f:
        f.write("Conteúdo de exemplo de uma mensagem de áudio")
    
    # Agendar para 7 dias no futuro
    delivery = datetime.now(timezone.utc) + timedelta(days=7)
    
    message = create_scheduled_message(
        file_path=example_file,
        client_name="Maria Silva",
        client_email="maria@example.com",
        title="Mensagem de Aniversário",
        description="Feliz aniversário! Esta mensagem foi gravada especialmente para você.",
        delivery_date=delivery
    )
    
    # Limpar arquivo de exemplo
    if os.path.exists(example_file):
        os.remove(example_file)
    
    # Exemplo 2: Listar todas as mensagens
    print("\n" + "=" * 60)
    list_messages()
    
    print("\n" + "=" * 60)
    print("Para mais informações, consulte o README.md")
    print("=" * 60)
