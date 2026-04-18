import Vote from '../Models/VoteModel.js';
import Poll from '../Models/PollModel.js';
import catchAsync from '../Utils/catchAsync.js';
import AppError from '../Utils/AppError.js';
import { sendSuccess } from '../Utils/response.js';

export const getPollInsights = catchAsync(async (req, res) => {
    const { pollId } = req.params;

    const poll = await Poll.findById(pollId);
    if (!poll) throw new AppError('Poll not found', 404);

    const votes = await Vote.find({ pollId }).sort({ createdAt: 1 });
    if (votes.length === 0) {
        return sendSuccess(res, 200, {
            message: 'Not enough data for insights',
            insights: null
        });
    }

    // 1. Outcome Prediction (Simple trend extrapolation)
    const voteCounts = {};
    poll.options.forEach(opt => voteCounts[opt._id] = 0);
    votes.forEach(v => voteCounts[v.optionId] = (voteCounts[v.optionId] || 0) + 1);

    const sortedOptions = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
    const leadingOptionId = sortedOptions[0][0];
    const leadingOptionText = poll.options.find(o => o._id.toString() === leadingOptionId)?.optionText;

    // 2. Voting Trends (Early vs Late)
    const midPoint = votes[Math.floor(votes.length / 2)].createdAt;
    const earlyVotes = votes.filter(v => v.createdAt <= midPoint);
    const lateVotes = votes.filter(v => v.createdAt > midPoint);

    // 3. User Behavior Clustering (Simplified)
    // Cluster users by voting time
    const morningVotes = votes.filter(v => new Date(v.createdAt).getHours() < 12).length;
    const afternoonVotes = votes.filter(v => new Date(v.createdAt).getHours() >= 12 && new Date(v.createdAt).getHours() < 18).length;
    const eveningVotes = votes.filter(v => new Date(v.createdAt).getHours() >= 18).length;

    const insights = {
        prediction: {
            likelyWinner: leadingOptionText,
            confidence: Math.min(((sortedOptions[0][1] / votes.length) * 100), 95).toFixed(2) + '%',
            message: `Based on current trends, "${leadingOptionText}" is likely to win.`
        },
        trends: {
            momentum: earlyVotes.length < lateVotes.length ? 'Increasing' : 'Decreasing',
            participationVelocity: (votes.length / ((new Date() - poll.startTime) / 3600000)).toFixed(2) + ' votes/hour'
        },
        userBehavior: {
            peakTime: morningVotes > afternoonVotes && morningVotes > eveningVotes ? 'Morning' : (afternoonVotes > eveningVotes ? 'Afternoon' : 'Evening'),
            distribution: { morning: morningVotes, afternoon: afternoonVotes, evening: eveningVotes }
        }
    };

    return sendSuccess(res, 200, { insights });
});
