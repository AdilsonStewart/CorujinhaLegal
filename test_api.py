#!/usr/bin/env python3
"""
Script de teste para a API CorujinhaLegal
Demonstra o uso dos principais endpoints
"""

import requests
import json
from datetime import datetime, timedelta, timezone
import os
import tempfile

BASE_URL = "http://localhost:5000"

def test_index():
    """Testa endpoint principal"""
    print("\n=== Testando GET / ===")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_create_message():
    """Testa criação de mensagem"""
    print("\n=== Testando POST /api/messages ===")
    
    # Criar arquivo de teste
    test_file_path = os.path.join(tempfile.gettempdir(), "test_audio.txt")
    with open(test_file_path, 'w') as f:
        f.write("Este é um arquivo de teste simulando áudio")
    
    # Renomear para ter extensão de áudio
    test_audio = os.path.join(tempfile.gettempdir(), "test_message.mp3")
    os.rename(test_file_path, test_audio)
    
    # Data de entrega: 7 dias no futuro
    delivery_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    
    files = {
        'file': ('test_message.mp3', open(test_audio, 'rb'), 'audio/mpeg')
    }
    
    data = {
        'client_name': 'João da Silva',
        'client_email': 'joao@example.com',
        'title': 'Mensagem de Teste',
        'description': 'Esta é uma mensagem de teste do sistema',
        'media_type': 'audio',
        'delivery_date': delivery_date
    }
    
    response = requests.post(f"{BASE_URL}/api/messages", files=files, data=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Limpar arquivo de teste
    if os.path.exists(test_audio):
        os.remove(test_audio)
    
    if response.status_code == 201:
        return response.json()['data']['id']
    return None

def test_list_messages():
    """Testa listagem de mensagens"""
    print("\n=== Testando GET /api/messages ===")
    response = requests.get(f"{BASE_URL}/api/messages")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_get_message(message_id):
    """Testa obtenção de mensagem específica"""
    print(f"\n=== Testando GET /api/messages/{message_id} ===")
    response = requests.get(f"{BASE_URL}/api/messages/{message_id}")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_delete_message(message_id):
    """Testa deleção de mensagem"""
    print(f"\n=== Testando DELETE /api/messages/{message_id} ===")
    response = requests.delete(f"{BASE_URL}/api/messages/{message_id}")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_download(message_id):
    """Testa download de mensagem"""
    print(f"\n=== Testando GET /api/messages/{message_id}/download ===")
    response = requests.get(f"{BASE_URL}/api/messages/{message_id}/download")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        # Salvar em arquivo temporário
        temp_file = os.path.join(tempfile.gettempdir(), "downloaded_message.mp3")
        with open(temp_file, 'wb') as f:
            f.write(response.content)
        print(f"Arquivo baixado para: {temp_file}")
        # Limpar arquivo
        if os.path.exists(temp_file):
            os.remove(temp_file)
        return True
    return False

def run_tests():
    """Executa todos os testes"""
    print("=" * 60)
    print("TESTES DA API CORUJINHALEGAL")
    print("=" * 60)
    
    try:
        # Teste 1: Endpoint principal
        if not test_index():
            print("❌ Teste do endpoint principal falhou")
            return
        print("✅ Endpoint principal OK")
        
        # Teste 2: Criar mensagem
        message_id = test_create_message()
        if not message_id:
            print("❌ Teste de criação de mensagem falhou")
            return
        print(f"✅ Mensagem criada com ID: {message_id}")
        
        # Teste 3: Listar mensagens
        if not test_list_messages():
            print("❌ Teste de listagem falhou")
            return
        print("✅ Listagem de mensagens OK")
        
        # Teste 4: Obter mensagem específica
        if not test_get_message(message_id):
            print("❌ Teste de obtenção de mensagem falhou")
            return
        print("✅ Obtenção de mensagem OK")
        
        # Teste 5: Download de mensagem
        if not test_download(message_id):
            print("❌ Teste de download falhou")
            return
        print("✅ Download de mensagem OK")
        
        # Teste 6: Deletar mensagem
        if not test_delete_message(message_id):
            print("❌ Teste de deleção falhou")
            return
        print("✅ Deleção de mensagem OK")
        
        print("\n" + "=" * 60)
        print("TODOS OS TESTES PASSARAM COM SUCESSO! ✅")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERRO: Não foi possível conectar ao servidor")
        print("Certifique-se de que o servidor está rodando em http://localhost:5000")
    except Exception as e:
        print(f"\n❌ ERRO: {str(e)}")

if __name__ == "__main__":
    run_tests()
