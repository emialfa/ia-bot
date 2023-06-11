const handleControllersErrors = (req, res, err) => {
    console.error(err.description);
    if (err.status) {
      res.status(err.status).send({
        message: err.message,
      });
    } else {
      res.status(500).send({
        message: err.message,
      });
    }
  };

  module.exports = { handleControllersErrors };