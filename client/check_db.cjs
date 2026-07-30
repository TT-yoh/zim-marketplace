const axios = require('axios');

async function checkSchema() {
    try {
        const response = await axios.get('https://qelpgmrbohsdkwvcsnov.supabase.co/rest/v1/', {
            headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlbHBnbXJib2hzZGt3dmNzbm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTA4MTMsImV4cCI6MjA5NjU4NjgxM30.6KDATpzmt1_3JmaUy1GGmWxTx1My8mJZYH2unn9Lmuo'
            }
        });
        const paths = response.data.paths;
        console.log("Available paths:", Object.keys(paths).filter(p => !p.startsWith('/rpc')));
        
        // Find products definition
        const defs = response.data.definitions;
        if (defs && defs.products) {
            console.log("Products schema:", defs.products);
        }
    } catch (err) {
        console.error(err);
    }
}

checkSchema();
