export default defineEventHandler(async () => {
    const data = await $fetch('https://api.truckyapp.com/v2/truckersmp/time', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    return data;
});