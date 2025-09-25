// Script para verificar sintaxe do products.js
const fs = require('fs');

try {
    const code = fs.readFileSync('js/products.js', 'utf8');
    
    // Tentar avaliar o código
    new Function(code);
    console.log('✓ Sintaxe OK');
} catch (error) {
    console.error('✗ Erro de sintaxe:', error.message);
    console.error('Linha:', error.lineNumber || 'desconhecida');
}