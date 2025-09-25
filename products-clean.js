// Teste de sintaxe limpa para ProductManager
const ProductManagerTest = {
    sortProducts: (products) => {
        switch (ProductState.sortBy) {
            case 'price_asc':
                return products.sort((a, b) => a.price - b.price);
            case 'price_desc':
                return products.sort((a, b) => b.price - a.price);
            case 'name_asc':
                return products.sort((a, b) => a.name.localeCompare(b.name));
            case 'rating':
                return products.sort((a, b) => b.rating - a.rating);
            case 'popular':
                return products.sort((a, b) => b.reviews - a.reviews);
            case 'newest':
            default:
                return products.sort((a, b) => b.id - a.id);
        }
    },

    renderProductCard: (product) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-product-id', product.id);
        return card;
    }
};

console.log('Sintaxe OK - Teste concluído');