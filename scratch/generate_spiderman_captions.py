import random

hooks = [
    "Spider-Man's reflexes are just on another level! 🕷️",
    "This web-swinging scene gives me chills every time. 🕸️",
    "Peter Parker's life is never easy, but he always finds a way. ❤️",
    "Is this the best Spider-Man suit we've seen so far? 🔥",
    "The way he saves the city is just legendary. 🏙️",
    "Neighborhood hero in action! 🔴🔵",
    "Wait for the web-shooter detail in this shot! 🕸️✨",
    "Spider-Sense tingling! ⚡",
    "Nobody does it like Spidey. 🕷️",
    "The responsibility that comes with this power... 🤟",
    "That swing was absolutely perfect! 🌆",
    "Spidey vs the world. Who's winning? 🌎",
    "The agility of Peter Parker is unmatched. 🤸‍♂️",
    "Can we talk about the cinematography in this Spider-Man scene? 🎥",
    "True hero energy right here. 🦸‍♂️",
    "Spider-Man: Across the city! 🏙️",
    "This scene proves why he's our favorite Avenger. 🛡️",
    "The suit tech is just insane! ⚙️",
    "Always helping the little guy. That's Spider-Man. 🤝",
    "Peter's struggle is what makes him so relatable. 💎",
    "Maximum effort from the web-head! 🕸️",
    "That landing was 10/10! 🎯",
    "Spidey's humor even in the middle of a fight! 😂",
    "The web-slinging physics here are incredible. 🧪",
    "One of the most iconic Spider-Man moments ever. 🏆"
]

details = [
    "Did you notice how he uses the environment here?",
    "The physics of the webs in this shot are so realistic.",
    "Look closely at the suit's texture in this scene.",
    "The way the Spider-Sense is visualized is brilliant.",
    "He's balancing school and saving the world perfectly.",
    "This shot shows the true scale of the city.",
    "The emotional weight of this moment is heavy.",
    "Every swing is calculated and smooth.",
    "The background details in this Marvel scene are hidden gems.",
    "Notice the lighting on the suit during the golden hour.",
    "His combat style is so unique and acrobatic.",
    "The sound design for the web shooters is iconic.",
    "You can see the determination in Peter's eyes.",
    "This transition between buildings is flawless.",
    "The sheer strength needed for this move is crazy.",
    "Spot the Easter egg in the background!",
    "The camera work really makes you feel like you're swinging.",
    "This is peak Spider-Man action.",
    "The bond between Peter and the city is unbreakable.",
    "Look at the way the web attaches to the surfaces."
]

ctas = [
    "Follow for daily Spider-Man clips! 🤟",
    "Tag a friend who loves the MCU! 🍿",
    "Like if Spider-Man is your favorite hero! ❤️",
    "Which Spider-Man is your favorite? Tell us in the comments! 👇",
    "Don't forget to follow for more epic movie moments! 🎬",
    "Save this for your Marvel collection! 📂",
    "Share this with a Peter Parker fan! 🕸️",
    "Subscribe for the best superhero content! 🔔",
    "What movie should we cover next? Let us know! 💬",
    "Hit that follow button for more daily shorts! 🚀"
]

hashtags = [
    "#spiderman #marvel #mcu #peterparker #avengers #spiderverse",
    "#tomholland #tobeymaguire #andrewgarfield #superhero #movieclips",
    "#cinema #marvelstudios #spidey #webhead #marvelcomics",
    "#superheromovies #actionmovies #filmclips #shorts #marveluniverse",
    "#neighborhero #starktech #multiverse #spidermanochase"
]

def generate_captions(count=200):
    captions = []
    for _ in range(count):
        hook = random.choice(hooks)
        detail = random.choice(details)
        cta = random.choice(ctas)
        tags = random.choice(hashtags)
        
        caption = f"{hook} {detail} {cta} {tags}"
        captions.append(caption)
    return captions

if __name__ == "__main__":
    generated = generate_captions(200)
    with open(r"d:\Team project\Video-auto-editor\Insta_Upload\captions.txt", "w", encoding="utf-8") as f:
        f.write("\n===\n".join(generated))
    print("Successfully generated 200 Spider-Man captions!")
