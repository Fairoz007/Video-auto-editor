import random

adjectives = ["Funny", "Crazy", "Insane", "Wild", "Hilarious", "Epic", "Chaotic", "Mind-blowing", "Top-tier"]
nouns = ["chaos", "trolling", "fails", "clutch moments", "plays", "action", "energy", "vibes"]
emojis = ["😂", "🔥", "💀", "🤯", "😎", "💯", "🎮", "👀"]

titles = []
for _ in range(1000):
    adj = random.choice(adjectives)
    noun = random.choice(nouns)
    emoji1 = random.choice(emojis)
    emoji2 = random.choice(emojis)
    title = f"{adj} Valorant {noun} {emoji1}{emoji2}"
    titles.append(title)

with open("titles.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(titles))
