const AGE_RATINGS_MAP = {
  1: {
    org: "esrb",
    region: "U.S. & CA",
    ratings: {
      3: "e",
      6: "rp",
      7: "ec",
      8: "e",
      9: "e10",
      10: "t",
      11: "m",
      12: "ao"
    }
  },
  2: {
    org: "pegi",
    region: "EU",
    ratings: {
      1: "3",
      2: "7",
      3: "12",
      4: "16",
      5: "18",
      9: "7"
    }
  },
  3: {
    org: "cero",
    region: "JP",
    ratings: {
      13: "a",
      14: "b",
      15: "c",
      16: "d",
      17: "z"
    }
  },
  4: {
    org: "usk",
    region: "DE",
    ratings: {
      18: "0",
      19: "6",
      20: "12",
      21: "16",
      22: "18"
    }
  },
  5: {
    org: "grac",
    region: "KR",
    ratings: {
      19: "19",
      23: "all",
      24: "12",
      25: "15",
      26: "19",
      27: "testing"
    }
  },
  6: {
    org: "class_ind",
    region: "BR",
    ratings: {
      28: "l",
      29: "10",
      30: "12",
      31: "14",
      32: "16",
      33: "18"
    }
  },
  7: {
    org: "acb",
    region: "AU",
    ratings: {
      34: "g",
      35: "pg",
      36: "m",
      37: "ma_15",
      38: "r_18",
      39: "rc"
    }
  }
}

export { AGE_RATINGS_MAP }