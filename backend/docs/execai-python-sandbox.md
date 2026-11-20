# ExecAI isolated Python service contract

ExecAI does not execute generated Python in the Node.js API process. Python is disabled unless `PYTHON_SANDBOX_URL` and `PYTHON_SANDBOX_TOKEN` are configured. The backend then sends requests to `POST {PYTHON_SANDBOX_URL}/v1/execute`.

There is deliberately no bundled or automatically enabled Python runner in
this repository. A separate HTTP process or container alone is not a security
sandbox: generated code could otherwise read the runner's credentials, inspect
its filesystem, or reach internal services. Keep both environment variables
unset until an independently isolated runner meets every control below and has
been reviewed. In particular, do not point them at a general-purpose Python
web service.

## Request

```json
{
  "request_id": "UUID",
  "code": "print(inputs['values'])",
  "inputs": {
    "values": [3, 5, 8]
  }
}
```

The request body is limited to 64 KB and code is limited to 16,000 characters.

## Response

```json
{
  "output": "serialized JSON-compatible result",
  "logs": ["optional bounded log lines"]
}
```

The response body is limited to 64 KB; the serialized `output` is limited to 32 KB. The backend applies an 8-second request timeout and truncates logs to 20 lines of 500 characters each.

## Required sandbox controls

This contract is an integration boundary, not a sandbox implementation or certification. Do not configure a general-purpose Python HTTP service. The separately deployed runner must:

- Execute each request in a fresh, isolated container or microVM under a non-root identity.
- Disable outbound network access, host filesystem access, container/runtime sockets, and access to cloud metadata services.
- Mount only an ephemeral, size-limited working directory; destroy it after execution.
- Enforce CPU, memory, process-count, and wall-clock limits independently of the API timeout.
- Pass only the request's JSON `inputs`; never inject application credentials, environment variables, database access, or tenant secrets.
- Return only JSON-serializable output and bounded logs, with no HTML or executable artifacts.
- Authenticate the caller, reject malformed or oversized requests, and avoid logging submitted code or customer data.
- Use HTTPS in production and protect the bearer token as a secret. Restrict service ingress to the backend network where possible.

Do not set the environment variables until the runner has been independently reviewed and meets these requirements. An HTTPS URL and bearer token alone do not make a Python service safe.
