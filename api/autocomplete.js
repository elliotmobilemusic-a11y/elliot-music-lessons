export default async function handler(req, res) {
    const { input } = req.query;

    if (!input) {
        return res.status(400).json({ error: "Missing input" });
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;

    const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
        `input=${encodeURIComponent(input)}&` +
        `types=geocode&` +
        `components=country:uk&` +
        `key=${key}`;

    const result = await fetch(url);
    const data = await result.json();

    res.status(200).json(data);
}
