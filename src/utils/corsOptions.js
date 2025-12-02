// const allowedOrigins = [
//   'http://localhost:3000',
//   'https://app-creative-people.vercel.app',
//   'https://app-server-o38y.onrender.com',
// ];

// const corsOptions = {
//   origin: (origin, callback) => {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,
// };

// export default corsOptions;
const allowedOrigins = [
  'http://localhost:3000',
  'https://app-creative-people.vercel.app',
  'https://app-server-o38y.onrender.com',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
  ],
  credentials: true,
  optionsSuccessStatus: 204,
};

export default corsOptions;
