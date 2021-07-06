### Experiment workflow

We report two versions of the repeated reference game: an `unconstrained` version closely following the in-lab protocol from prior work, and a `sequential` version that cues each target in a sequence of trials.

To run these experiments on your local machine:

1. navigate to the location where you want to create your project, and enter 
   ```
   git clone https://github.com/hawkrobe/tangrams.git
   ```
   at the command line to create a local copy of this repository. On Windows, run this command in the shell.

2. Make sure node.js and npm (the node package manager) are installed on your machine. Node.js sponsors an [official download](http://nodejs.org/download/) for all systems. For an advanced installation, there are good instructions [here](https://gist.github.com/isaacs/579814).

3. Run ```npm install``` at the command line (from inside the `experiments` directory) to install dependencies.

4. Finally, to run the experiment, run ```node app.js tangrams_sequential``` at the command line. You should expect to see the following message:
   ```
   info  - socket.io started
       :: Express :: Listening on port 8888
   ```
   This means that you've successfully created a 'server' that can be accessed by copying and pasting 
   ```
   http://localhost:8888/tangrams_sequential/index.html
   ```
   in one tab of your browser. You should see a waiting room. To connect the other player in another tab for test purposes, open a new tab and use the same URL. 
