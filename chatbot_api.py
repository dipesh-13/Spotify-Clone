from flask import Flask, request, jsonify
from flask_cors import CORS
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Sample trending artists and songs (in a real app, this would come from a database or API)
trending_artists = [
    "Taylor Swift",
    "Drake",
    "Bad Bunny",
    "The Weeknd",
    "Ed Sheeran",
    "Billie Eilish",
    "Post Malone",
    "Ariana Grande",
    "Justin Bieber",
    "Dua Lipa"
]

trending_songs = [
    {"title": "Flowers", "artist": "Miley Cyrus", "genre": "Pop"},
    {"title": "Vampire", "artist": "Olivia Rodrigo", "genre": "Pop"},
    {"title": "Last Night", "artist": "Morgan Wallen", "genre": "Country"},
    {"title": "Rich Flex", "artist": "Drake & 21 Savage", "genre": "Hip-Hop"},
    {"title": "Anti-Hero", "artist": "Taylor Swift", "genre": "Pop"},
    {"title": "Unholy", "artist": "Sam Smith & Kim Petras", "genre": "Pop"},
    {"title": "As It Was", "artist": "Harry Styles", "genre": "Pop"},
    {"title": "About Damn Time", "artist": "Lizzo", "genre": "Pop"},
    {"title": "Break My Soul", "artist": "Beyoncé", "genre": "Pop"},
    {"title": "First Class", "artist": "Jack Harlow", "genre": "Hip-Hop"}
]

# Sample playlists by genre
playlists = {
    "pop": [
        "Today's Top Hits",
        "All Out 2010s",
        "Pop Mix",
        "Pop Rising",
        "Pop Life"
    ],
    "hip-hop": [
        "RapCaviar",
        "Most Necessary",
        "Hip-Hop Mix",
        "Beast Mode",
        "Chill Hits"
    ],
    "rock": [
        "Rock Classics",
        "Rock Mix",
        "Alternative Rock",
        "Rock This",
        "Rock Hard"
    ],
    "electronic": [
        "Mint",
        "Electronic Mix",
        "Dance Party",
        "Chill Tracks",
        "Electronic Rising"
    ],
    "jazz": [
        "Jazz Vibes",
        "Jazz Classics",
        "Jazz Mix",
        "Coffee Table Jazz",
        "Jazz Covers"
    ]
}

# Spotify-themed responses
responses = {
    "greeting": [
        "Hey there! Welcome to Spotify! How can I help you discover some great music today?",
        "Hello! Ready to find your next favorite song?",
        "Hi! Let's make your music experience better!"
    ],
    "farewell": [
        "Thanks for chatting! Keep the music playing!",
        "See you later! Don't forget to check out our new releases!",
        "Bye! Hope you found what you were looking for!"
    ],
    "help": [
        "I can help you with:\n- Finding new music\n- Creating playlists\n- Managing your account\n- Troubleshooting\nWhat would you like to know?",
        "Need help? I can assist with music discovery, playlists, and more!",
        "I'm here to help! Ask me about music, playlists, or account settings!"
    ],
    "playlist": [
        "To create a playlist:\n1. Click 'Your Library'\n2. Select 'Create Playlist'\n3. Give it a name and description\n4. Start adding songs!",
        "You can create playlists for different moods, activities, or genres. Just go to Your Library and click 'Create Playlist'!",
        "Want to share your playlist? Click the three dots next to your playlist and select 'Share'!"
    ],
    "premium": [
        "Spotify Premium offers:\n- Ad-free listening\n- Offline downloads\n- High quality audio\n- Unlimited skips\nWant to try it?",
        "Upgrade to Premium for the best music experience! Get offline mode, better sound quality, and no ads.",
        "Premium members get exclusive features like offline listening and high-quality audio. Want to know more?"
    ],
    "discover": [
        "Check out our 'Discover Weekly' playlist - it's updated every Monday with new songs based on your taste!",
        "Try our 'Daily Mix' playlists - they're personalized just for you based on your listening history.",
        "Explore new music through our 'Release Radar' - it shows you new releases from artists you follow!"
    ],
    "account": [
        "To manage your account:\n1. Click your profile picture\n2. Select 'Account'\n3. Choose what you want to update",
        "Need to change your password? Go to Account Settings > Security > Change Password",
        "Want to update your profile? Click your profile picture > Profile > Edit Profile"
    ],
    "download": [
        "To download songs for offline listening:\n1. Go to the song/album/playlist\n2. Click the download icon\n3. Make sure you're on Premium!",
        "Download your favorite songs for offline listening with Spotify Premium! Just click the download icon next to any song.",
        "Premium members can download up to 10,000 songs on each device. Perfect for when you're offline!"
    ],
    "share": [
        "To share music:\n1. Click the three dots next to any song\n2. Select 'Share'\n3. Choose your sharing method",
        "Share your favorite tracks with friends! Use the share button to send via social media or messaging apps.",
        "Want to share your current song? Click the share icon in the Now Playing bar!"
    ],
    "equalizer": [
        "To adjust your equalizer:\n1. Go to Settings\n2. Find 'Playback'\n3. Select 'Equalizer'\n4. Choose a preset or customize",
        "Customize your sound with our equalizer! Find it in Settings > Playback > Equalizer",
        "Try different equalizer presets to find the perfect sound for your music!"
    ],
    "trending": [
        "Here are some trending artists right now:\n" + "\n".join(f"- {artist}" for artist in trending_artists[:5]),
        "Check out these trending songs:\n" + "\n".join(f"- {song['title']} by {song['artist']}" for song in trending_songs[:5]),
        "Want to know what's hot? Here are some trending tracks:\n" + "\n".join(f"- {song['title']} ({song['genre']})" for song in trending_songs[:5])
    ],
    "recommend": [
        "Based on your taste, you might like:\n" + "\n".join(f"- {song['title']} by {song['artist']}" for song in random.sample(trending_songs, 3)),
        "Here are some recommendations for you:\n" + "\n".join(f"- {song['title']} ({song['genre']})" for song in random.sample(trending_songs, 3)),
        "Try these tracks:\n" + "\n".join(f"- {song['title']} by {song['artist']}" for song in random.sample(trending_songs, 3))
    ],
    "playlists_by_genre": [
        "Here are some great playlists for {genre}:\n" + "\n".join(f"- {playlist}" for playlist in playlists["pop"]),
        "Check out these {genre} playlists:\n" + "\n".join(f"- {playlist}" for playlist in playlists["hip-hop"]),
        "Discover these {genre} collections:\n" + "\n".join(f"- {playlist}" for playlist in playlists["rock"])
    ],
    "default": [
        "I'm not sure I understand. Could you try asking about music, playlists, or account help?",
        "Hmm, I'm not quite sure about that. Maybe try asking about music recommendations?",
        "I'm still learning! Try asking me about Spotify features or music!"
    ]
}

def get_response(message):
    message = message.lower()
    
    if any(word in message for word in ['hi', 'hello', 'hey']):
        return random.choice(responses['greeting'])
    elif any(word in message for word in ['bye', 'goodbye', 'see you']):
        return random.choice(responses['farewell'])
    elif any(word in message for word in ['help', 'support', 'how to']):
        return random.choice(responses['help'])
    elif any(word in message for word in ['playlist', 'create playlist', 'make playlist']):
        return random.choice(responses['playlist'])
    elif any(word in message for word in ['premium', 'upgrade', 'subscription']):
        return random.choice(responses['premium'])
    elif any(word in message for word in ['discover', 'new music', 'recommendations']):
        return random.choice(responses['discover'])
    elif any(word in message for word in ['account', 'profile', 'settings']):
        return random.choice(responses['account'])
    elif any(word in message for word in ['download', 'offline', 'save']):
        return random.choice(responses['download'])
    elif any(word in message for word in ['share', 'send', 'social']):
        return random.choice(responses['share'])
    elif any(word in message for word in ['equalizer', 'sound', 'audio quality']):
        return random.choice(responses['equalizer'])
    elif any(word in message for word in ['trending', 'popular', 'top', 'chart']):
        return random.choice(responses['trending'])
    elif any(word in message for word in ['recommend', 'suggest', 'similar']):
        return random.choice(responses['recommend'])
    elif any(word in message for word in ['pop', 'hip-hop', 'rock', 'jazz', 'electronic']):
        genre = next((g for g in ['pop', 'hip-hop', 'rock', 'jazz', 'electronic'] if g in message), 'pop')
        return random.choice(responses['playlists_by_genre']).format(genre=genre)
    else:
        return random.choice(responses['default'])

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message', '')
    response = get_response(message)
    return jsonify({'response': response})

if __name__ == '__main__':
    app.run(port=5000) 