// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ROVAVerifier — Completion proof validation for physical tasks
/// @notice Robots submit proof of delivery (GPS + timestamp + sensor hash).
///         Verifier checks proof validity and signals ROVAMarket for escrow release.
contract ROVAVerifier {
    // ─── Types ───────────────────────────────────────────────────
    struct Proof {
        uint256 jobId;
        int64   latitudeE7;     // latitude * 1e7 (e.g. 52.4120000 = 524120000)
        int64   longitudeE7;    // longitude * 1e7
        uint256 timestamp;
        bytes32 sensorHash;     // keccak256 of sensor data (camera, weight, etc.)
        bool    verified;
        bool    rejected;
    }

    // ─── State ───────────────────────────────────────────────────
    address public admin;
    address public market;      // ROVAMarket address — only contract that reads verification results

    mapping(uint256 => Proof) public proofs;                    // jobId => proof
    mapping(uint256 => int64[2]) public jobDestinations;        // jobId => [lat, lng] expected
    mapping(uint256 => uint256) public jobDeadlines;            // jobId => deadline timestamp
    uint256 public gpsTolerance = 1000;                         // tolerance in E7 units (~10m)

    // ─── Events ──────────────────────────────────────────────────
    event ProofSubmitted(uint256 indexed jobId, int64 lat, int64 lng, bytes32 sensorHash);
    event ProofVerified(uint256 indexed jobId);
    event ProofRejected(uint256 indexed jobId, string reason);
    event JobDestinationSet(uint256 indexed jobId, int64 lat, int64 lng, uint256 deadline);

    // ─── Errors ──────────────────────────────────────────────────
    error NotAdmin();
    error NotMarket();
    error ProofAlreadySubmitted();
    error JobNotConfigured();
    error ProofNotSubmitted();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyMarket() {
        if (msg.sender != market) revert NotMarket();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────
    constructor() {
        admin = msg.sender;
    }

    // ─── Configuration (called by ROVAMarket on job creation) ───
    function setJobDestination(
        uint256 jobId,
        int64 latE7,
        int64 lngE7,
        uint256 deadline
    ) external onlyMarket {
        jobDestinations[jobId] = [latE7, lngE7];
        jobDeadlines[jobId] = deadline;
        emit JobDestinationSet(jobId, latE7, lngE7, deadline);
    }

    // ─── Proof Submission (called by robot / robot SDK) ──────────
    function submitProof(
        uint256 jobId,
        int64 latE7,
        int64 lngE7,
        bytes32 sensorHash
    ) external {
        if (proofs[jobId].timestamp != 0) revert ProofAlreadySubmitted();
        if (jobDeadlines[jobId] == 0) revert JobNotConfigured();

        proofs[jobId] = Proof({
            jobId: jobId,
            latitudeE7: latE7,
            longitudeE7: lngE7,
            timestamp: block.timestamp,
            sensorHash: sensorHash,
            verified: false,
            rejected: false
        });

        emit ProofSubmitted(jobId, latE7, lngE7, sensorHash);

        // Auto-verify
        _verify(jobId);
    }

    // ─── Verification Logic ──────────────────────────────────────
    function _verify(uint256 jobId) internal {
        Proof storage p = proofs[jobId];
        int64[2] storage dest = jobDestinations[jobId];
        uint256 deadline = jobDeadlines[jobId];

        // Check SLA
        if (p.timestamp > deadline) {
            p.rejected = true;
            emit ProofRejected(jobId, "SLA_BREACH");
            return;
        }

        // Check GPS proximity
        int64 latDiff = p.latitudeE7 - dest[0];
        int64 lngDiff = p.longitudeE7 - dest[1];
        if (latDiff < 0) latDiff = -latDiff;
        if (lngDiff < 0) lngDiff = -lngDiff;

        if (uint64(latDiff) > gpsTolerance || uint64(lngDiff) > gpsTolerance) {
            p.rejected = true;
            emit ProofRejected(jobId, "GPS_MISMATCH");
            return;
        }

        // All checks pass
        p.verified = true;
        emit ProofVerified(jobId);
    }

    // ─── Views ───────────────────────────────────────────────────
    function isVerified(uint256 jobId) external view returns (bool) {
        return proofs[jobId].verified;
    }

    function isRejected(uint256 jobId) external view returns (bool) {
        return proofs[jobId].rejected;
    }

    function getProof(uint256 jobId) external view returns (Proof memory) {
        return proofs[jobId];
    }

    // ─── Admin ───────────────────────────────────────────────────
    function setMarket(address _market) external onlyAdmin {
        market = _market;
    }

    function setGpsTolerance(uint256 _tolerance) external onlyAdmin {
        gpsTolerance = _tolerance;
    }

    function setAdmin(address _admin) external onlyAdmin {
        admin = _admin;
    }
}
