export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { igUsername } = req.body;
  try {
    const response = await fetch(`https://graph.instagram.com/v12.0/me?fields=id,username,profile_picture_url&access_token=${process.env.INSTAGRAM_API_TOKEN}`);
    const data = await response.json();
    if (data.username === igUsername) {
      res.status(200).json({ profilePicUrl: data.profile_picture_url });
    } else {
      res.status(404).json({ error: 'Instagram username not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify Instagram profile' });
  }
}