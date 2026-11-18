
# Network optimiser

For this project we chose to build a web based implemention of the Edmonds-Karp algorithm for network analysis and optimization.

The intended users of this project are network administrators attempting to understand how their network topology is limited by throughput.

This tool enables network engineers to design and model their network architectures and test them prior to deployment.

## Usage

You can try the app online, it is hosted on firebase. The url is attached to this github repo.

To try locally:

```sh
git clone https://github.com/Oxyn4/ECM3422-network-optimizer
```

```sh
cd ECM3422-network-optimizer 


```sh
npm run dev
```

and follow the instructions NPM outputs.

## Edmonds-karp

The algorithms underpinning this work is the Edmonds-Karp, this algorithm finds the maximum amound of flow between two nodes designated the source and sink in a flow network.

Edmonds-Karp complexity has time complexity: O(V * E^2) and space complexity: O(V + E) it works with a zero'd flow network, it then builds a augmented path from
the source to the sink using breadth first search. This is repeated until all paths to the sink are exhausted. The sum of flow across the paths is the maximum flow.


## Testing

To test the application we used vitest unit tests in addition to providing testing utilities in the UI such as create random network.

you can find tests in:

- src/algorithm/ek.test.js: core edmonds-karp algorithm testing
- src/data/SampleNetwork.test.js: network datastructure testing

## Limitations

The limitations for this this project include a lack of simultion of computer hardware, while the theoretical modelling tools like this provide a valueable first step, in reality throughput in computer networks is also determined by the protocols in use, e.g SSH vs HTTP; How fast a computer can generate packets and protocol messages to be sent through the network and factors such as the physical delivery method, e.g wifi vs ethernet.

Our tool does little to simulate real world networking hardware including the preformance of firewalls dropping or letting packets progress and this is something we would explore further in later work. The tool also does not account for dropped packets in a network.


## Contributor details



# AI declaration

We complied with the universities of exeters definition of AI-assisted.