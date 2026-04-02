/**
 * Photo manifest - curated list of 73 route photos with verified mile markers.
 * Used by scripts/match-photos.js to produce public/data/photos.json.
 * All mile markers verified by route owner.
 *
 * Selection criteria:
 *   - Route photos only: gravel roads, trail sections, on-route landmarks, riders on route
 *   - Excluded: non-route content (art print, broken bike off-route)
 *   - Excluded: near-duplicate shots (kept best of each cluster)
 */
const photoManifest = [
  // -- Mi 10: early route, pine forest --
  { filename: 'vuDqMrdPXVpE5EqIcUGGFDuCJElTSlxBs5j_Tn6eWt0-1536x2048.jpg', mi: 10.4 },

  // -- Mi 13-14: early route, pre-Laughing Whitefish --
  { filename: 'HPBlbKhBz0-5_T0sbj2ih_5vs1nQMxLG63JgbSmpYcc-1536x2048 (1).jpg', mi: 13.8 },

  // -- Mi 19-25: early route, Laughing Whitefish area --
  { filename: 'ipimpW4SR0M8AGHKeltyECQ-YyKS4i5Hkjx9rnpCRKU-1536x2048.jpg', mi: 19.6 },
  { filename: 'SvBAhzwpTg-p2BZyPrO-aKBFQoKBPvrofDZAEUdYROc-1536x2048.jpg', mi: 21.1 },
  // -- Mi 21-23: Billie Helmer KOM --
  { filename: 'photo-1675213442182-24e1c1671387.avif', mi: 22.1 },
  { filename: 'eU0XZxNsbPxjjIaHRdggS_6hf4hiHO5W4zXxgABMZfA-2048x1536.jpg', mi: 25.5 },

  // -- Mi 26-34: forest transitions, approaching Chatham --
  { filename: 'ocbHm30HWGIBDMhMARec4eQ86L5Bw_yNG1Sa1NtkfW0-2048x1536.jpg', mi: 26.9 },
  { filename: 'B3H7XrP6re-qBv1nmYna8FUVtMi99oS2COcbWqy9jUM-1536x2048.jpg', mi: 28.0 },
  { filename: 'dBsqoFt8DrIh62Kl-ipHqPcLOcPX_1hTDh3P2wF1ito-1536x2048.jpg', mi: 29.6 },
  { filename: '9LPmnV_B2upQWPNXL8f-E-kQejlR9D8dB020l9sBABE-2048x1536.jpg', mi: 29.9 },
  { filename: '7VxxcsJbDUoTUahckfY3vON_pJ1p8VKFtGgR_OGC628-1536x2048.jpg', mi: 30.6 },
  { filename: 'yIYnleuQJa2LMt4HOH8RZMEOl-mipq9OLQUOnKXk3tw-1536x2048.jpg', mi: 31.0 },
  { filename: 'wjtbDIGN8S-Zv9OlnOrdAQXdmkWIaCDSylTq3SuXr80-1536x2048.jpg', mi: 32.0 },
  { filename: 'vt4-1cfgZEie4a6LYVgSTR6QW8oGnFXWxdJweXlwmk8-2048x1536.jpg', mi: 32.2 },
  { filename: 'waY-Dewnq6C_jc-o-6a7Xp77kMQWIaZPP8z9ajs_70I-1536x2048.jpg', mi: 32.6 },
  { filename: 'AQ8t34n9H_j2iXTnn4esifeYEl8BHrQvWj6-TWAgYDA-1536x2048.jpg', mi: 33.7 },

  // -- Mi 34-37: Chatham approach, farmland-to-forest transition --
  { filename: 'XDYCDB6mW1v7JQcNRAwMe6q6Y9Q3TJ6p3iTv8JCAzT8-1536x2048.jpg', mi: 34.3 },
  { filename: 'CDYGZA6ut7rVIwdJeClXNiQ-5F0qaqKVjnBwYZJfi60-1536x2048.jpg', mi: 34.8 },
  { filename: '__aLw1cc4B-Afog5HsRoufSHIxiJO-0sjKRRIhcc0Hc-1536x2048.jpg', mi: 35.9 },
  { filename: 'hdzn_qyMQhfF6S1FxmymwdiRJkHy46EoGqKZQHD0AKM-1536x2048.jpg', mi: 35.95 },
  { filename: '18paMdZ5GTI7zq7ecq_GXbbkzfodQVhQ0ymvt-_DuXk-1536x2048.jpg', mi: 36.0 },
  { filename: 'nz816x4qLeaL5hOWCNFb0U_zN-_wXFOK9Wg3UN9Qw7Y-1536x2048.jpg', mi: 36.1 },
  { filename: 'kCnGlazdroEOqyuZbLm-IV-0tygCJqxQisOFw-BuZyg-1536x2048.jpg', mi: 36.5 },

  // -- Mi 37-38: Chatham area, Co-Op Store landmark --
  { filename: 'bhQNOmQCAG6CF-cN3-IMST5n7mj0EmWXHiZLgbZdXDM-1536x2048.jpg', mi: 37.2 },
  { filename: 'LjGaTm477e8AIETL1O3YAf9TMDzETMuS6TVK0NB-bQ0-2048x1536.jpg', mi: 37.3 },
  { filename: 'mUKLtmdM0THz8jg_AB0fWRgNqy6BIZC0CHCncoTB6Tc-1536x2048.jpg', mi: 37.4 },
  { filename: 'leaving-chatham-rock-river-rd.png', mi: 37.6 },

  // -- Mi 39-44: post-Chatham, Akkala/Haavisto sector, dense hardwood forest --
  { filename: 'jjKDqzzlsz4tP617dCOtswkB5VlW8sXfeZiz965RXjE-1536x2048.jpg', mi: 39.5 },
  { filename: 'ULyOG9yaMot_llHphjqi4bbQsFrMXSAyBNyDgrzeQIU-1536x2048.jpg', mi: 40.1 },
  { filename: 'ipfw_ehbbc_x1yHQh1cRQ9m0aHTdFMgSn7eiTz4R2e0-1536x2048.jpg', mi: 40.1 },
  { filename: '4DLSgkj2_jeCh_vruEj0nt7HKrZNpDsRJlCFOWm69u8-1536x2048.jpg', mi: 40.2 },
  { filename: 'cjdSeALMjBNbQANZi8uEptwBZ-6RL2FRFkaVXeuA2rY-1536x2048.jpg', mi: 40.2 },
  { filename: 'ie1actFmAd8fKAzmMQuMmMUAQYGW_DI7e1S8khWCFbE-1536x2048.jpg', mi: 40.2 },
  { filename: 'ToF21A9tWe_viEKnKg2Pw74nB43rGnE666fONrfwuPk-1536x2048.jpg', mi: 40.2 },
  { filename: 'CRb2b5VYN7bB1wBuxb5fA6BmXAsP5_IIADulrcgBBBM-1536x2048.jpg', mi: 40.2 },
  { filename: 'GCZMQWGD1tsUDDdMaOvWAnryWEvfJ6VZbBp1SGflBE8-1536x2048.jpg', mi: 41.2 },
  { filename: '82txNy7A7Q5B19GMEoM5aWOTj_ruZCMQ_bomK9AJyz8-1536x2048.jpg', mi: 41.9 },
  { filename: '0O-2vb6d64dIb8BoPPOv70_h0KpKTEkMYjNkfOJJ6xQ-1536x2048.jpg', mi: 43.2 },
  { filename: 'm5jUx7ttRsxQkAXQ1mJMtFRwJwkIzcg6xaQgNfH8NHg-1536x2048.jpg', mi: 43.3 },
  { filename: 'U0F71UsLJeVsU698DTo3pP3HmH4PtQRyAhJmAL3jFPQ-1536x2048.jpg', mi: 43.4 },
  { filename: 'LpoxSYsBzxnVR1Z1bNDmCMY69nbZE3Wim8gzgExAqMs-1536x2048.jpg', mi: 43.8 },
  { filename: 'nMjnLjbpQB2Me4T92DAYFoEhF2zqz6_l_6eeCxmNlJY-1536x2048.jpg', mi: 43.8 },
  { filename: '24ZVzxK3JpEal6NaW52VpTtD5ERGPbp3R3fprBteYVg-1536x2048.jpg', mi: 43.9 },

  // -- Mi 46-53: Forest Service Road sector, power line corridors --
  { filename: 'PMZhWpw1cRv1dd_9JoGQpOI_8z69OMPTCN4NfqsOst0-1536x2048.jpg', mi: 46.2 },
  { filename: 'Rh4lqzbhHiwBzEJY6XG0Avc6haQL3ncD7rWHROJntSE-1536x2048.jpg', mi: 46.2 },
  { filename: 'poXUtdA0jHLpvSodpn46b3VlPB6mIIv5F-6VhVpvF68-1536x2048.jpg', mi: 46.3 },
  { filename: 'fr1HxZ42VZCq0LV-cLhYYRB-J861FXOd8QrUfxFaeVA-1536x2048.jpg', mi: 46.9 },
  { filename: 'ZcCmXFNZmW3n0OLe8obmRBgjoZvUwbnmJJfKqxRA-Lk-1536x2048.jpg', mi: 46.9 },
  { filename: 'rl6DSEakuHOMSH3G24F_jiISBErA_BuNhNCG2JGsBEM-1536x2048.jpg', mi: 51.2 },
  { filename: '93pdx3un8hBTW6j5ysd4maNkPSRl8-955AYo2vtQOLU-1536x2048.jpg', mi: 52.2 },

  // -- Mi 55-57: deep forest, approaching C4 sector --
  { filename: 'OQ3xED3f5T_KBXMhgpt-LZGU-yhIu36wFcap6uUT_is-1536x2048.jpg', mi: 55.0 },
  { filename: 'w8IxOx5OtF7iGypDYfHPOeRsw091XR3m3LYD4a4-dJw-1536x2048.jpg', mi: 55.4 },
  { filename: 'qntlvVm5sG217j3zD_lf3KGqB-oRW9g_pq0awUqrX4c-1536x2048.jpg', mi: 55.5 },
  { filename: 'LV0VjkrsnCZ5_2mZk1lTlVeeCVPxgFG_2_kEEQMFwPY-1536x2048.jpg', mi: 55.6 },
  { filename: 'qwE6YRMOqapn-OPmvXZUE6ABlxAp-GYCDG0kYmxomXY-2048x1536.jpg', mi: 55.6 },
  { filename: 'jpWZNe0Tkg0C-kgPVTDNnHCqQWJ8Iv_xfxT7EHsYO-o-1536x2048.jpg', mi: 55.7 },
  { filename: 'TDpZETSgQkDKgX_TPqtqdfrgeXYng1foZ0Sg0wYU7MM-2048x1536.jpg', mi: 56.0 },
  { filename: 'bFuy7XibzBZGM0Xxx92_JYluGnZROmghJg7o_MgqHCU-1536x2048.jpg', mi: 56.5 },

  // -- Mi 60-65: C4 sector, roughest gravel, water crossings --
  { filename: 'QxKpirdmeCXIoWhflUVbxsUXRoF9E9D6lDG5xMr6fFY-1536x2048.jpg', mi: 60.0 },
  { filename: 'lDc_WSD8-6oaxGXmegCxWJMRguK9jSqULQiuN2zZy6U-1536x2048.jpg', mi: 60.0 },
  { filename: '2hX2RzHWb2HBzkd1bc68hqeTn0zJuV_pMnXDyFDKZOM-1536x2048.jpg', mi: 60.1 },
  { filename: '5lckZGXLDgmouH4B0ONSzjpwouFMJ957uZD31-FuqJg-1536x2048.jpg', mi: 63.1 },
  { filename: 'MvYek6iGTxbVXGtLxnR2BybaDFvgOg24w5w0c68qMxI-1536x2048.jpg', mi: 63.8 },
  { filename: 'e19A9TZckQueVTGwoeVD8wQJRdcXPSdWODGR3O1Bvmc-1536x2048.jpg', mi: 63.9 },
  { filename: 'aKU4CEExEgpuAWOcY-QHCbAkYtA7dLV4QjlgSUx966w-1536x2048.jpg', mi: 64.2 },

  // -- Mi 66-81: late route, Silver Creek KOM, finish approach --
  { filename: 'Wrp9cErN8YEogpvno-NEqJvzqUGWdmesit--gZmK3jg-1536x2048.jpg', mi: 66.6 },
  { filename: 'Kd-ZcWFZTTubJxNhsBWi3_ZDJ5-yIMF0Jl0w8haYzZk-1536x2048.jpg', mi: 76.3 },
  { filename: 'aI8-qjgYasaaJ3Xu6RcqyaSk5EzCVwPbNGH1xn2PwFQ-1536x2048.jpg', mi: 78.7 },
  { filename: 'AU6maRolPI2hBS7Tu7-zDxC6u20udvzQv6Dix2f_jhQ-1536x2048.jpg', mi: 80.2 },

  // -- Mi 83-84: Down Jeep sector --
  { filename: '68686675_2890293017652424_6952024628709556224_n.jpg', mi: 83.8 },

  // -- Mi 91-96: final miles, route finish --
  { filename: '3-QHvzJIeVE74Z49q3GF-yAIY99bvmpu1N23jDyj6ng-1536x2048.jpg', mi: 91.1 },
  { filename: '-puZf5h8FVPBCvKwc79j5fOPJ0zOaFvVubT62OaAWLw-1536x2048.jpg', mi: 95.1 },
  { filename: 'mXQPKVsctLmV9XN-4NbU2eSHyoyeMfJghqr9a3iryNQ-1542x2048.jpg', mi: 95.4 },
];

module.exports = { photoManifest };
