import { sendContactMessage } from '../contacts/contact.js';

export const sendContactMessageController = async (req, res) => {
  await sendContactMessage(req.body);

  res.status(200).json({
    status: 200,
    message: 'Message has been sent successfully',
    data: {},
  });
};
