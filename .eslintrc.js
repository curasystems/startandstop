module.exports = {
    "extends": "airbnb-base",
    "parser": "babel-eslint",
    "plugins": [
        "flowtype",
        "import"
    ],
    "rules": {
        "semi": [1,"never"],
        "no-trailing-spaces": [0],
        "no-use-before-define": [1, 'nofunc'],
        "no-underscore-dangle": [0],
        "import/no-extraneous-dependencies": [0],
        "import/prefer-default-export": [1],
        "no-restricted-syntax": [0],
        "comma-dangle": [1],
        "global-require": [0],
        "linebreak-style": [0],
        "class-methods-use-this": [0],
        "max-len": [1],
        "comma-dangle": [0]
    },
    "globals": {
    }
};
