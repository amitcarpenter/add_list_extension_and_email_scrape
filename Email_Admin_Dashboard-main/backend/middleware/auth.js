const isLogin = async (req, res, next) => {
  try {
    if (req.session.user_id) {
    } else {
      return res.redirect("/");
    }

    next();
  } catch (error) {
    console.log(error);
  }
};

const isLogout = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      return res.redirect("/dashboard");
    }

    next();
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  isLogin,
  isLogout,
};
