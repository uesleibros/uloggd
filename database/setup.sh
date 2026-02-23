#!/bin/bash

# =============================================
# uloggd Database Setup Script
# =============================================
# Script automatizado para configurar o banco de dados
# =============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════╗"
echo "║                                          ║"
echo "║        🎮 uloggd Database Setup 🎮      ║"
echo "║                                          ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

if ! command_exists psql; then
  echo -e "${RED}❌ Erro: PostgreSQL client (psql) não está instalado${NC}"
  echo ""
  echo "Instale com:"
  echo "  • Ubuntu/Debian: sudo apt-get install postgresql-client"
  echo "  • macOS: brew install postgresql"
  echo "  • Windows: https://www.postgresql.org/download/windows/"
  echo ""
  exit 1
fi

echo -e "${CYAN}📋 Antes de continuar, você precisa:${NC}"
echo "  1. Criar um projeto no Supabase (https://app.supabase.com)"
echo "  2. Ter em mãos a URL do projeto e a senha do banco"
echo ""
echo -e "${YELLOW}Encontre essas informações em:${NC}"
echo "  Settings → Database → Connection String"
echo ""

read -p "$(echo -e ${CYAN}Digite a URL do seu projeto Supabase \(ex: db.abc123xyz.supabase.co\): ${NC})" SUPABASE_HOST

if [[ ! $SUPABASE_HOST =~ ^db\.[a-zA-Z0-9]+\.supabase\.co$ ]]; then
  echo -e "${YELLOW}⚠️  Formato inválido. Usando formato padrão...${NC}"
  read -p "$(echo -e ${CYAN}Digite apenas o Project Reference \(ex: abc123xyz\): ${NC})" PROJECT_REF
  SUPABASE_HOST="db.${PROJECT_REF}.supabase.co"
fi

read -sp "$(echo -e ${CYAN}Digite a senha do banco de dados: ${NC})" DB_PASSWORD
echo ""
echo ""

DB_URL="postgresql://postgres:${DB_PASSWORD}@${SUPABASE_HOST}:5432/postgres"

echo -e "${BLUE}🔌 Testando conexão...${NC}"
if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Conexão estabelecida com sucesso!${NC}"
else
  echo -e "${RED}❌ Erro: Não foi possível conectar ao banco${NC}"
  echo ""
  echo "Verifique:"
  echo "  • A URL está correta?"
  echo "  • A senha está correta?"
  echo "  • Você copiou a URL de 'Connection String' no Supabase?"
  echo ""
  exit 1
fi

echo ""
echo -e "${CYAN}📦 O que deseja fazer?${NC}"
echo "  1) Setup completo (schema + seed) - Recomendado para primeira vez"
echo "  2) Apenas schema (estrutura do banco)"
echo "  3) Apenas seed (dados iniciais)"
echo "  4) Reset (limpar todos os dados)"
echo "  5) Drop tudo (recomeçar do zero) ⚠️"
echo ""

read -p "$(echo -e ${CYAN}Escolha uma opção \[1-5\]: ${NC})" OPTION

case $OPTION in
  1)
    echo ""
    echo -e "${BLUE}📦 Importando schema...${NC}"
    psql "$DB_URL" -f "$(dirname "$0")/schema.sql" -q
    echo -e "${GREEN}✅ Schema importado${NC}"
    
    echo ""
    echo -e "${BLUE}🌱 Importando dados iniciais...${NC}"
    psql "$DB_URL" -f "$(dirname "$0")/seed.sql" -q
    echo -e "${GREEN}✅ Dados iniciais importados${NC}"
    ;;
  
  2)
    echo ""
    echo -e "${BLUE}📦 Importando schema...${NC}"
    psql "$DB_URL" -f "$(dirname "$0")/schema.sql" -q
    echo -e "${GREEN}✅ Schema importado${NC}"
    ;;
  
  3)
    echo ""
    echo -e "${BLUE}🌱 Importando dados iniciais...${NC}"
    psql "$DB_URL" -f "$(dirname "$0")/seed.sql" -q
    echo -e "${GREEN}✅ Dados iniciais importados${NC}"
    ;;
  
  4)
    echo ""
    echo -e "${YELLOW}⚠️  ATENÇÃO: Isto irá apagar TODOS os dados do banco!${NC}"
    read -p "$(echo -e ${RED}Tem certeza? \(sim/não\): ${NC})" CONFIRM
    
    if [[ $CONFIRM == "sim" ]]; then
      echo ""
      echo -e "${BLUE}🗑️  Resetando banco...${NC}"
      psql "$DB_URL" -f "$(dirname "$0")/reset.sql" -q
      echo -e "${GREEN}✅ Banco resetado${NC}"
    else
      echo -e "${YELLOW}Operação cancelada${NC}"
      exit 0
    fi
    ;;
  
  5)
    echo ""
    echo -e "${RED}⚠️  ATENÇÃO: Isto irá REMOVER TUDO (estrutura + dados)!${NC}"
    echo -e "${RED}Você terá que rodar o setup novamente depois.${NC}"
    read -p "$(echo -e ${RED}Tem CERTEZA ABSOLUTA? \(DELETAR/não\): ${NC})" CONFIRM
    
    if [[ $CONFIRM == "DELETAR" ]]; then
      echo ""
      echo -e "${BLUE}💣 Removendo tudo...${NC}"
      psql "$DB_URL" -f "$(dirname "$0")/drop.sql" -q
      echo -e "${GREEN}✅ Tudo removido${NC}"
      echo ""
      echo -e "${CYAN}Execute o script novamente e escolha opção 1 para recriar${NC}"
    else
      echo -e "${YELLOW}Operação cancelada (ufa!)${NC}"
      exit 0
    fi
    ;;
  
  *)
    echo -e "${RED}❌ Opção inválida${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}║       ✨ Setup concluído com sucesso! ✨║${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📝 Próximos passos:${NC}"
echo ""
echo "  1. Configure a autenticação Discord:"
echo "     • Supabase Dashboard → Authentication → Providers"
echo "     • Habilite Discord e preencha Client ID/Secret"
echo ""
echo "  2. Configure as variáveis de ambiente:"
echo "     • Copie .env.example para .env.local"
echo "     • Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY"
echo "     • Encontre em: Settings → API no Supabase Dashboard"
echo ""
echo "  3. Inicie o projeto:"
echo "     • npm install"
echo "     • npm run dev"
echo ""
echo -e "${PURPLE}🎮 Bom desenvolvimento!${NC}"
echo ""