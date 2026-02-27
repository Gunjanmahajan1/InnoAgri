import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

# EMBEDDED BIO-ACOUSTIC DATASET


# Features: [Plant, Frequency_Hz, Amplitude_mV]
X_data = [
    ["Sugarcane",320,4.5],
    ["Sugarcane",410,3.8],
    ["Sugarcane",95,1.2],
    ["Sugarcane",780,2.1],
    ["Sugarcane",14500,0.9],

    ["Tomato",2100,2.9],
    ["Tomato",2600,3.4],
    ["Tomato",430,1.0],
    ["Tomato",9800,1.6],

    ["Mango",5200,2.7],
    ["Mango",6100,2.4],
    ["Mango",150,0.8],
    ["Mango",13200,1.1],

    ["Cotton",1800,2.6],
    ["Cotton",2200,3.1],
    ["Cotton",300,0.9],
    ["Cotton",11800,1.3],

    ["Maize",350,3.7],
    ["Maize",420,4.0],
    ["Maize",110,0.7],
    ["Maize",8700,1.8]
]

# Labels
y_data = [
    "Stem Borer","Stem Borer","Healthy","Stem Borer","Red Rot",
    "Bollworm","Bollworm","Healthy","Fruit Fly Maggot",
    "Fruit Fly Maggot","Fruit Fly Maggot","Healthy","Fungal Rot",
    "Bollworm","Bollworm","Healthy","Fungal Rot",
    "Stem Borer","Stem Borer","Healthy","Fruit Fly Maggot"
]


# ENCODING


plant_encoder = LabelEncoder()
plants = [row[0] for row in X_data]
plant_ids = plant_encoder.fit_transform(plants)

# numeric feature matrix
X = []
for i,row in enumerate(X_data):
    X.append([plant_ids[i], row[1], row[2]])

X = np.array(X)

label_encoder = LabelEncoder()
y = label_encoder.fit_transform(y_data)


# TRAIN MODEL


model = RandomForestClassifier(n_estimators=100)
model.fit(X,y)


# PREDICTION FUNCTION


def detect_pest(plant, freq, amp):
    plant_id = plant_encoder.transform([plant])[0]
    pred = model.predict([[plant_id, freq, amp]])
    return label_encoder.inverse_transform(pred)[0]

# TEST

if __name__ == "__main__":
    print("Test 1:", detect_pest("Sugarcane",350,3.6))
    print("Test 2:", detect_pest("Tomato",2300,3.0))
    print("Test 3:", detect_pest("Mango",5400,2.5))
    print("Test 4:", detect_pest("Cotton",2000,2.8))
    print("Test 5:", detect_pest("Sugarcane",100,1.0))