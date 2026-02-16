export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email' });
    }

    const FORMSPREE_ID = process.env.FORMSPREE_ID;

    if (!FORMSPREE_ID) {
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    try {
        const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            return res.status(502).json({ error: 'Submission failed' });
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(502).json({ error: 'Submission failed' });
    }
}
