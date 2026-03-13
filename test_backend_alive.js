const test = async () => {
    try {
        const response = await fetch('http://localhost:5000/');
        const text = await response.text();
        console.log('Backend response:', text);
    } catch (err) {
        console.error('Backend NOT reachable:', err.message);
    }
};
test();
