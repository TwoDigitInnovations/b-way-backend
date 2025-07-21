const passport = require("passport");
const response = require("@responses");

const auth = (...allowedRoles) => {
    return (req, res, next) => {
        passport.authenticate('jwt', { session: false }, function (err, user, info) {
            if (err) { 
                return response.error(res, err); 
            }
            
            if (!user) { 
                return response.unAuthorize(res, info || { message: "Authentication required" }); 
            }

            if (allowedRoles.length === 0) {
                req.user = user;
                return next();
            }
            
            if (!allowedRoles.includes(user.role)) { 
                return response.unAuthorize(res, { message: "Insufficient permissions" }); 
            }
            
            req.user = user;
            next();
        })(req, res, next);
    }
};

module.exports = auth;
