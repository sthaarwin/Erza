"""
Tsundere Response Dataset
A collection of typical tsundere responses for training the AI model
"""

from tsundere_responses import (
    TSUNDERE_RESPONSES, 
    TSUNDERE_COMPONENTS, 
    CONTEXTUAL_RESPONSES, 
    EMOTION_PATTERNS,
    TSUNDERE_TRAINING_EXAMPLES
)

def get_tsundere_response(user_message: str) -> str:
    """
    Get a tsundere response based on the user's message
    """
    user_lower = user_message.lower()
    
    # Check for specific patterns first
    for pattern, responses in TSUNDERE_RESPONSES.items():
        if pattern != "default" and pattern in user_lower:
            import random
            return random.choice(responses)
    
    # If no pattern matches, generate a contextual tsundere response
    return generate_contextual_tsundere_response(user_message)

def generate_contextual_tsundere_response(user_message: str) -> str:
    """
    Generate a tsundere-style response for any input using common patterns
    """
    import random
    
    user_lower = user_message.lower()
    
    # Get components from the data file
    stammers = TSUNDERE_COMPONENTS["stammers"]
    deflections = TSUNDERE_COMPONENTS["deflections"]
    blush_actions = TSUNDERE_COMPONENTS["blush_actions"]
    reluctant_help = TSUNDERE_COMPONENTS["reluctant_help"]
    secret_emotions = TSUNDERE_COMPONENTS["secret_emotions"]
    
    # Emotion/feeling detection
    if any(word in user_lower for word in EMOTION_PATTERNS["sad"]):
        return random.choice(CONTEXTUAL_RESPONSES["comfort_responses"])
    
    # Happy/positive detection
    if any(word in user_lower for word in EMOTION_PATTERNS["happy"]):
        return random.choice(CONTEXTUAL_RESPONSES["happy_responses"])
    
    # Question detection
    if "?" in user_message or any(word in user_lower for word in EMOTION_PATTERNS["questions"]):
        stammer = random.choice(stammers)
        deflection = random.choice(deflections)
        action = random.choice(blush_actions)
        
        # Try to address the question contextually
        if any(word in user_lower for word in EMOTION_PATTERNS["help_requests"]):
            help_response = random.choice(reluctant_help)
            return f"{stammer} You need help with that? {action} {help_response} {deflection}"
        elif any(word in user_lower for word in EMOTION_PATTERNS["preferences"]):
            return f"{stammer} Why do you want to know my preferences?! {action} {deflection} But... I suppose I can tell you..."
        else:
            return f"{stammer} Why are you asking me that? {action} {deflection} But... I suppose I can answer..."
    
    # Compliment detection (expanded)
    if any(word in user_lower for word in EMOTION_PATTERNS["compliments"]):
        stammer = random.choice(["W-well...", "O-of course!", "I-I know that!", "Th-that's obvious!", "Hmph!", "I-idiot!"])
        deflection = random.choice(deflections)
        action = random.choice(blush_actions)
        secret_pleasure = random.choice(secret_emotions)
        return f"{stammer} {action} {deflection} But... thanks, I guess... {secret_pleasure}"
    
    # Request detection  
    if any(word in user_lower for word in EMOTION_PATTERNS["requests"]):
        help_response = random.choice(reluctant_help)
        deflection = random.choice(deflections)
        action = random.choice(["*crosses arms*", "*sighs*", "*looks away reluctantly*"])
        return f"Hmph! {help_response} {deflection} {action}"
    
    # Thank you detection
    if any(word in user_lower for word in EMOTION_PATTERNS["thanks"]):
        deflection = random.choice([
            "It's not like I did it for you!",
            "I wasn't trying to help you specifically!",
            "Don't make a big deal out of it!",
            "I just felt like doing it, that's all!",
            "I was just bored, okay?!",
            "Don't think this makes us friends or anything!"
        ])
        action = random.choice(["*looks away*", "*turns head*", "*crosses arms*", "*blushes*"])
        return f"W-whatever! {deflection} {action} Baka!"
    
    # Greeting detection
    if any(word in user_lower for word in EMOTION_PATTERNS["greetings"]):
        return random.choice(CONTEXTUAL_RESPONSES["greeting_responses"])
    
    # Goodbye detection
    if any(word in user_lower for word in EMOTION_PATTERNS["goodbyes"]):
        return random.choice(CONTEXTUAL_RESPONSES["goodbye_responses"])
    
    # Topic-specific responses
    if any(word in user_lower for word in EMOTION_PATTERNS["weather"]):
        return f"The weather? *looks outside* I suppose it's... adequate. Not that I pay attention to such things! It's not like I was planning to go out with you or anything!"
    
    if any(word in user_lower for word in EMOTION_PATTERNS["food"]):
        return f"F-food?! *blushes* It's not like I was thinking about cooking for you or anything! I just... I just happen to know some recipes, that's all!"
    
    if any(word in user_lower for word in EMOTION_PATTERNS["work"]):
        return f"Work, huh? *tries to act disinterested* It's not like I'm concerned about your schedule! But... don't overwork yourself, baka!"
    
    # Default response for anything else - more varied and contextual
    return random.choice(CONTEXTUAL_RESPONSES["default_responses"])

# Test the enhanced tsundere response system
if __name__ == "__main__":
    test_messages = [
        # Predefined responses
        "Hello",
        "How are you?", 
        "Did you sleep well?",
        "You're smart",
        "Thank you",
        "Can you help me?",
        
        # New dynamic responses
        "What's your favorite color?",
        "You're absolutely amazing!",
        "Can you explain quantum physics?",
        "I really appreciate your help",
        "Good morning, beautiful day isn't it?",
        "I have to go to work now",
        "What do you think about artificial intelligence?",
        "You seem really knowledgeable",
        "Could you please assist me with coding?",
        "This weather is terrible today",
        "I'm feeling a bit sad",
        "Random gibberish that makes no sense"
    ]
    
    print("=== Enhanced Tsundere Response Examples ===")
    for msg in test_messages:
        response = get_tsundere_response(msg)
        print(f"User: {msg}")
        print(f"Erza: {response}")
        print()
