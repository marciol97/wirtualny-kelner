import React, {useState, useEffect} from "react";

export default function TimeElapsed({createdAt }) {
    const [timeString, setTimeString] = useState('00:00');
    const [isLate, setIsLate] = useState(false);

    useEffect(() => {
        if (!createdAt) return;

        const updateTimer = () => {
            const startTime = createdAt.toDate().getTime();
            const now = Date.now();

            const diffSeconds = Math.floor((now - startTime) / 1000);

            if (diffSeconds < 0) return;

            const minutes = Math.floor(diffSeconds / 60);
            const seconds = diffSeconds % 60;

            const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            setTimeString(formatted);

            if (minutes >= 15) {
                setIsLate(true);
            }
        };

        updateTimer();

        const intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    }, [createdAt]);

    return (
        <>
            {isLate && <div className="late-bg-overlay"></div>}

            <span style={{
                fontFamily: 'monospace',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: isLate ? '#dc2626' : '#4b5563',
                animation: isLate ? 'pulse 2s infinite' : 'none'
            }}>
            {timeString}
        </span>
        </>
    );
}