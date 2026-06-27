export default async function handler(req, res) {
    const { type, username } = req.query;

    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    try {
        if (type === 'solved') {
            const query = `
                query userProblemsSolved($username: String!) {
                    matchedUser(username: $username) {
                        submitStatsGlobal {
                            acSubmissionNum {
                                difficulty
                                count
                            }
                        }
                    }
                }
            `;
            
            const response = await fetch('https://leetcode.com/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Referer': 'https://leetcode.com'
                },
                body: JSON.stringify({
                    query,
                    variables: { username }
                })
            });

            const data = await response.json();
            
            if (data.errors) {
                throw new Error(data.errors[0].message);
            }

            const stats = data.data.matchedUser.submitStatsGlobal.acSubmissionNum;
            const easy = stats.find(s => s.difficulty === 'Easy')?.count || 0;
            const medium = stats.find(s => s.difficulty === 'Medium')?.count || 0;
            const hard = stats.find(s => s.difficulty === 'Hard')?.count || 0;
            const all = stats.find(s => s.difficulty === 'All')?.count || 0;

            return res.status(200).json({
                solvedProblem: all,
                easySolved: easy,
                mediumSolved: medium,
                hardSolved: hard
            });
        } 
        
        if (type === 'calendar') {
            const query = `
                query userProfileCalendar($username: String!) {
                    matchedUser(username: $username) {
                        userCalendar {
                            submissionCalendar
                        }
                    }
                }
            `;
            
            const response = await fetch('https://leetcode.com/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Referer': 'https://leetcode.com'
                },
                body: JSON.stringify({
                    query,
                    variables: { username }
                })
            });

            const data = await response.json();

            if (data.errors) {
                throw new Error(data.errors[0].message);
            }

            return res.status(200).json({
                submissionCalendar: data.data.matchedUser.userCalendar.submissionCalendar
            });
        }

        return res.status(400).json({ error: "Invalid type parameter. Use 'solved' or 'calendar'." });

    } catch (error) {
        console.error("LeetCode API Proxy Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
