import transporter, { canSendEmail } from '../Config/nodemailerAuth.js';
import User from '../Models/UserModel.js';
import OrgMember from '../Models/OrgMemberModel.js';

export const notifyNewPoll = async (poll, orgId) => {
    if (!canSendEmail) return;

    // Get all members of the org
    const members = await OrgMember.find({ orgId }).populate('userId');
    const emails = members.map(m => m.userId?.email).filter(e => e);

    if (emails.length === 0) return;

    const mailOptions = {
        bcc: emails,
        subject: `New Poll: ${poll.title}`,
        text: `A new poll has been created in your organization: ${poll.title}\n\nDescription: ${poll.description}\n\nVote now before ${new Date(poll.endTime).toLocaleString()}`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`New poll notifications sent to ${emails.length} users`);
    } catch (err) {
        console.error('Failed to send mail:', err);
    }
};

export const notifyPollClosingSoon = async (poll) => {
    if (!canSendEmail) return;

    const members = await OrgMember.find({ orgId: poll.orgId }).populate('userId');
    const emails = members.map(m => m.userId?.email).filter(e => e);

    if (emails.length === 0) return;

    const mailOptions = {
        bcc: emails,
        subject: `Closing Soon: ${poll.title}`,
        text: `The poll "${poll.title}" is closing in 1 hour. Make sure to cast your vote!`
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error('Failed to send closing soon mail:', err);
    }
};
