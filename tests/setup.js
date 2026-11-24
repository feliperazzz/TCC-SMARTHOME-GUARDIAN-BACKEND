// Roda antes de cada arquivo de teste
process.env.JWT_SECRET = 'segredo_de_teste_nao_usar_em_producao';
process.env.NODE_ENV = 'test';