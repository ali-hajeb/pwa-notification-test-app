import React, { useEffect, useState } from "react";
import { openDB } from "idb";
import PWABadge from "./PWABadge";
import './App.css'
import './home.css'

interface Medication {
    id?: number;
    name: string;
    interval: number;
    startTime: Date;
}

const Home: React.FC = () => {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [name, setName] = useState("");
    const [interval, setInterval] = useState(0);
    const [startTime, setStartTime] = useState(new Date());

    useEffect(() => {
        Notification.requestPermission();
    }, []);

    const addMedication = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const newMedication: Medication = { name, interval, startTime };
        setMedications([...medications, newMedication]);
        // Add to IndexedDB
        const db = await openDB("medicationDB", 1, {
            upgrade(db) {
                db.createObjectStore("medications", {
                    keyPath: "id",
                    autoIncrement: true,
                });
            },
        });
        const id = await db.add("medications", newMedication);
        // Schedule notifications
        scheduleNotification(id as number, name, interval, startTime);
    };

    const scheduleNotification = (
        id: number,
        name: string,
        interval: number,
        startTime: Date
    ) => {
        // Calculate the time for the next notification
        const now = new Date();
        let nextTime = new Date(startTime.getTime());
        while (nextTime < now) {
            nextTime = new Date(nextTime.getTime() + interval * 60000); // interval in minutes
        }
        // Schedule the notification for the next time
        setTimeout(() => {
            Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                    navigator.serviceWorker
                        .getRegistration()
                        .then((registration) => {
                            if (registration) {
                                registration.showNotification(
                                    "Medication Reminder",
                                    {
                                        body: `Time to take your medication: ${name}`,
                                        tag: `medication-reminder-${id}`,
                                    }
                                );
                                // Schedule the next notification
                                scheduleNotification(
                                    id,
                                    name,
                                    interval,
                                    nextTime
                                );
                            } else {
                                console.error(
                                    "Service Worker registration not found."
                                );
                            }
                        });
                }
            });
        }, nextTime.getTime() - now.getTime());
    };

    // Render form to input medication details and list of scheduled medications
    return (
        <div className="main">
            <PWABadge />
            <form onSubmit={addMedication}>
                <div>
                    <input
                        type='text'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder='Medication Name'
                        required
                    />
                </div>
                <div>
                    <input
                        type='number'
                        value={interval}
                        onChange={(e) => setInterval(Number(e.target.value))}
                        placeholder='Interval (minutes)'
                        required
                    />
                </div>
                <div>
                    <input
                        type='datetime-local'
                        value={startTime.toISOString().slice(0, 16)}
                        onChange={(e) => setStartTime(new Date(e.target.value))}
                        required
                    />
                </div>

                <button type='submit'>Add Medication</button>
            </form>
            <ul>
                {medications.map((medication) => (
                    <li key={medication.id}>
                        {medication.name} - Every {medication.interval} minutes
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Home;
