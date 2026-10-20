// Expo troca process.env.EXPO_PUBLIC_* pelo valor do .env no build, então o acesso
// precisa ser literal (sem process.env[chave]).
const pocketbaseUrl = process.env.EXPO_PUBLIC_POCKETBASE_URL;

if (!pocketbaseUrl) {
    throw new Error('EXPO_PUBLIC_POCKETBASE_URL não definida. Copie .env.example para .env.');
}

export const env = {
    pocketbaseUrl: pocketbaseUrl.replace(/\/+$/, ''),
};
