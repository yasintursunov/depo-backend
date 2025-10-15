const express = require('express');

const app = express();
const port = 3000;

app.get('/debug', (req, res) => {
    console.log('worked');
    res.send('Debug endpoint accessed');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});