import random

# Common CTAs
ctas = [
    "Follow for more daily movie clips! 🎬",
    "Tag a friend who needs to see this! 🍿",
    "Like and Subscribe for the best scenes! ❤️",
    "Which movie should we cover next? Tell us below! 👇",
    "Don't forget to follow for more epic moments! 🚀",
    "Save this for your movie collection! 📂",
    "Share this with a true fan! ✨",
    "Hit that follow button for daily shorts! 🔥",
    "What's your favorite scene from this? 💬",
    "Follow for more cinema highlights! 🏆"
]

# Movie Data
movie_data = {
    "Spider-Man": {
        "hooks": [
            "Spider-Man's reflexes are just on another level! 🕷️",
            "This web-swinging scene gives me chills every time. 🕸️",
            "Peter Parker's life is never easy, but he always finds a way. ❤️",
            "Is this the best Spider-Man suit we've seen so far? 🔥",
            "Neighborhood hero in action! 🔴🔵",
            "Spider-Sense tingling! ⚡",
            "The responsibility that comes with this power... 🤟",
            "Spidey's humor even in the middle of a fight! 😂"
        ],
        "details": [
            "Did you notice how he uses the environment here?",
            "The physics of the webs in this shot are so realistic.",
            "Look closely at the suit's texture in this scene.",
            "He's balancing school and saving the world perfectly.",
            "The camera work really makes you feel like you're swinging.",
            "Notice the lighting on the suit during the golden hour."
        ],
        "hashtags": [
            "#spiderman #marvel #mcu #peterparker #avengers #spiderverse",
            "#tomholland #tobeymaguire #andrewgarfield #superhero #movieclips"
        ]
    },
    "Batman": {
        "hooks": [
            "Gotham's guardian is watching. 🦇",
            "The Dark Knight doesn't play around. 🌑",
            "I'm Batman. 🦇",
            "The fear he instills in criminals is peak Batman. 👊",
            "Justice has a name, and it's Bruce Wayne. 💼",
            "The legend of the Bat continues. 🦇",
            "Vengeance has arrived in Gotham. 🔥"
        ],
        "details": [
            "The gritty atmosphere of Gotham is captured perfectly here.",
            "The Batmobile looks absolutely lethal in this shot.",
            "The stealth in this scene is pure Batman.",
            "Look at the detail on the Batsuit—it's battle-worn.",
            "The cinematography in the shadows is top-tier.",
            "He really is the world's greatest detective."
        ],
        "hashtags": [
            "#batman #darkknight #dc #gotham #brucewayne #joker",
            "#dccomics #justiceleague #thebatman #robertpattinson #christianbale"
        ]
    },
    "John Wick": {
        "hooks": [
            "Don't touch his dog. 🐕",
            "The Baba Yaga is coming for them. 💀",
            "Focus, commitment, and sheer will. 🕯️",
            "One man against the entire High Table. 🔫",
            "He's not the Boogeyman... he's the one you send to kill the Boogeyman. 🗡️",
            "John Wick is a force of nature. 🌪️",
            "Nobody escapes John Wick. 🚪"
        ],
        "details": [
            "The gun-fu choreography is just insane in this scene.",
            "The lighting in the Continental is visually stunning.",
            "He reloads with such precision—true tactical mastery.",
            "The stunt work in this movie is legendary.",
            "Notice the use of neon colors in the background.",
            "Every movement is calculated and efficient."
        ],
        "hashtags": [
            "#johnwick #keanureeves #action #gunfu #continental #babayaga",
            "#stunts #actionmovies #assassin #hightable #johnwick4"
        ]
    },
    "Breaking Bad": {
        "hooks": [
            "Say my name. 🧪",
            "I am the one who knocks! 🚪",
            "Heisenberg is in the building. 🎩",
            "Jesse, we need to cook. 🚐",
            "The transformation of Walter White is legendary. 💎",
            "Better call Saul! ⚖️",
            "Science, b*tch! 🧪⚡"
        ],
        "details": [
            "The cinematography in the New Mexico desert is iconic.",
            "Walter White's descent into darkness is so well acted.",
            "Notice the use of color—the yellow suits are classic.",
            "The tension in this scene is absolutely palpable.",
            "Blue sky—the purest product in the game.",
            "The chemistry (literally) in this show is unmatched."
        ],
        "hashtags": [
            "#breakingbad #walterwhite #heisenberg #jessepinkman #bryancranston",
            "#bettercallsaul #amc #tvshows #classic #aarounpaul"
        ]
    }
}

def generate_captions(count_per_movie=200):
    all_captions = []
    
    for movie, content in movie_data.items():
        for _ in range(count_per_movie):
            hook = random.choice(content["hooks"])
            detail = random.choice(content["details"])
            cta = random.choice(ctas)
            tags = random.choice(content["hashtags"])
            
            caption = f"{hook} {detail} {cta} {tags}"
            all_captions.append(caption)
    
    random.shuffle(all_captions)
    return all_captions

if __name__ == "__main__":
    generated = generate_captions(200) # Total 800 captions
    with open(r"d:\Team project\Video-auto-editor\Insta_Upload\captions.txt", "w", encoding="utf-8") as f:
        f.write("\n===\n".join(generated))
    print(f"Successfully generated {len(generated)} captions for multiple movies!")
