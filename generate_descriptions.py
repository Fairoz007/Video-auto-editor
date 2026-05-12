import random

adjectives1 = ["Funny", "Crazy", "Insane", "Wild", "Hilarious", "Epic", "Chaotic", "Mind-blowing", "Top-tier"]
adjectives2 = ["chaos", "trolling", "fails", "clutch moments", "plays", "action", "energy", "vibes"]
emojis1 = ["😂", "🔥", "💀", "🤯", "😎", "💯", "🎮", "👀"]

descriptions = []

for _ in range(1000):
    desc = f"""Funny Valorant moments with chaos 😂  
Best trolling, funny plays, crazy smoke moments.

🎮 Game: Valorant  
🔥 Daily Shorts Uploads  
👍 Like & Subscribe for more funny clips

#valorant #valorantshorts #gaming #funny #shorts #fps #viral"""
    descriptions.append(desc)

with open("descriptions.txt", "w", encoding="utf-8") as f:
    f.write("\n===\n".join(descriptions))
