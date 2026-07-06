const text = `
Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics to solve problems too complex for classical computers. 
Today, IBM Quantum makes real quantum hardware -- a tool scientists only began to imagine three decades ago -- available to hundreds of thousands of developers. 
Our engineers deliver ever-more-powerful superconducting quantum processors at regular intervals, along with crucial software advances that change how these processors can be used.
This work sits at the intersection of physics, computer science, and information theory.

While classical computers encode information in binary "bits" that can either be 0s or 1s, quantum computers encode information in "qubits" (quantum bits). 
A qubit can be a 1 or a 0, or it can exist in a superposition of both states simultaneously. 
Another unique property is entanglement, where two qubits become linked so that the state of one instantly influences the other, regardless of distance.
These properties allow quantum computers to process complex calculations exponentially faster than classical supercomputers for certain types of problems.

The potential applications are vast. In materials science, quantum computers could simulate complex molecular structures, leading to the discovery of new drugs or better batteries. 
In cryptography, they pose both a threat to current encryption methods and a solution through quantum key distribution, promising theoretically unhackable communications.
Financial modeling, logistics optimization, and artificial intelligence are also areas where quantum algorithms are expected to make significant impacts in the coming decade.
`;

fetch('http://127.0.0.1:54321/functions/v1/process-content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: text,
    source_type: 'text',
    title: 'Quantum Computing Overview',
    existing_subjects: []
  })
}).then(res => res.json()).then(data => {
  console.log(JSON.stringify(data, null, 2));
}).catch(console.error);
