const hasCookie = (req, res, next) => {
    const authToken = req.cookies.authToken;

    if (!authToken) {
        return res.redirect('/');
    }

    next();
};

export default hasCookie;
