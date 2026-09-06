// client/src/utils/productImageMatcher.js

// High-resolution realistic web asset dictionary for automated hardware & auto-part matching
export const CATEGORY_IMAGE_PRESETS = {
    'battery': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&auto=format&fit=crop&q=60',
    'drill': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&auto=format&fit=crop&q=60',
    'screwdriver': 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=500&auto=format&fit=crop&q=60',
    'rivet': 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=500&auto=format&fit=crop&q=60',
    'welding': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop&q=60',
    'cable': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop&q=60',
    'filter': 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500&auto=format&fit=crop&q=60',
    'bearing': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60',
    'oil': 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=500&auto=format&fit=crop&q=60',
    'engine': 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=500&auto=format&fit=crop&q=60',
    'autoparts': 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500&auto=format&fit=crop&q=60',
    'hardware': 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=500&auto=format&fit=crop&q=60'
};

export function matchProductImage(title = '', category = '') {
    const text = (title + ' ' + category).toLowerCase();

    if (text.includes('battery') || text.includes('duceller') || text.includes('exide') || text.includes('cell')) {
        return CATEGORY_IMAGE_PRESETS['battery'];
    }
    if (text.includes('drill') || text.includes('twist') || text.includes('hss') || text.includes('bit')) {
        return CATEGORY_IMAGE_PRESETS['drill'];
    }
    if (text.includes('screwdriver') || text.includes('spanner') || text.includes('wrench') || text.includes('plier')) {
        return CATEGORY_IMAGE_PRESETS['screwdriver'];
    }
    if (text.includes('rivet') || text.includes('rvt') || text.includes('bolt') || text.includes('nut') || text.includes('screw') || text.includes('fastener')) {
        return CATEGORY_IMAGE_PRESETS['rivet'];
    }
    if (text.includes('flux') || text.includes('brazing') || text.includes('weld') || text.includes('solder') || text.includes('electrode')) {
        return CATEGORY_IMAGE_PRESETS['welding'];
    }
    if (text.includes('cable') || text.includes('wire') || text.includes('clip') || text.includes('terminal') || text.includes('plug')) {
        return CATEGORY_IMAGE_PRESETS['cable'];
    }
    if (text.includes('filter') || text.includes('element') || text.includes('gasket') || text.includes('seal')) {
        return CATEGORY_IMAGE_PRESETS['filter'];
    }
    if (text.includes('bearing') || text.includes('bushing') || text.includes('pulley') || text.includes('roller')) {
        return CATEGORY_IMAGE_PRESETS['bearing'];
    }
    if (text.includes('oil') || text.includes('lubricant') || text.includes('grease') || text.includes('fluid') || text.includes('coolant')) {
        return CATEGORY_IMAGE_PRESETS['oil'];
    }
    if (text.includes('engine') || text.includes('piston') || text.includes('crank') || text.includes('cylinder') || text.includes('valve') || text.includes('alternator') || text.includes('clutch')) {
        return CATEGORY_IMAGE_PRESETS['engine'];
    }

    return CATEGORY_IMAGE_PRESETS['hardware'];
}
